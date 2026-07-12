import mongoose, { type Model } from 'mongoose'
import { connectMongo } from '@/lib/mongo'
import {
  Account,
  Category,
  Coupon,
  Order,
  OrderItem,
  Product,
  Session,
  SiteEvent,
  User,
  VerificationToken,
} from '@/lib/models'

type AnyRecord = Record<string, unknown>

function isObjectIdString(value: unknown): value is string {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && value.length === 24
}

function toObjectId(value: unknown) {
  if (value instanceof mongoose.Types.ObjectId) return value
  if (isObjectIdString(value)) return new mongoose.Types.ObjectId(value)
  return value
}

function mapValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(mapValue)
  if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof mongoose.Types.ObjectId)) {
    const input = value as AnyRecord
    if ('gte' in input || 'gt' in input || 'lte' in input || 'lt' in input || 'in' in input || 'not' in input || 'startsWith' in input || 'contains' in input || 'equals' in input) {
      const out: AnyRecord = {}
      if ('gte' in input) out.$gte = mapValue(input.gte)
      if ('gt' in input) out.$gt = mapValue(input.gt)
      if ('lte' in input) out.$lte = mapValue(input.lte)
      if ('lt' in input) out.$lt = mapValue(input.lt)
      if ('in' in input) out.$in = mapValue(input.in)
      if ('not' in input) out.$ne = mapValue(input.not)
      if ('equals' in input) return mapValue(input.equals)
      if ('startsWith' in input) out.$regex = `^${escapeRegex(String(input.startsWith))}`
      if ('contains' in input) out.$regex = escapeRegex(String(input.contains))
      return out
    }

    const out: AnyRecord = {}
    for (const [key, nested] of Object.entries(input)) {
      out[key === 'id' ? '_id' : key] = mapValue(nested)
    }
    return out
  }
  return toObjectId(value)
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mapWhere(where: AnyRecord = {}): AnyRecord {
  const out: AnyRecord = {}

  for (const [key, value] of Object.entries(where)) {
    if (key === 'NOT' && value && typeof value === 'object') {
      const nested = mapWhere(value as AnyRecord)
      out.$nor = [nested]
      continue
    }
    if (key === 'AND' && Array.isArray(value)) {
      out.$and = value.map(item => mapWhere(item as AnyRecord))
      continue
    }
    if (key === 'OR' && Array.isArray(value)) {
      out.$or = value.map(item => mapWhere(item as AnyRecord))
      continue
    }

    const field = key === 'id' ? '_id' : key
    out[field] = mapValue(value)
  }

  return out
}

function mapOrderBy(orderBy?: AnyRecord | AnyRecord[]) {
  if (!orderBy) return undefined
  const list = Array.isArray(orderBy) ? orderBy : [orderBy]
  const sort: AnyRecord = {}
  for (const item of list) {
    for (const [key, direction] of Object.entries(item)) {
      const field = key === 'id' ? '_id' : key
      sort[field] = direction === 'desc' ? -1 : 1
    }
  }
  return sort
}

function serialize(doc: unknown): unknown {
  if (doc == null) return doc
  if (Array.isArray(doc)) return doc.map(serialize)
  if (doc instanceof Date) return doc
  if (doc instanceof mongoose.Types.ObjectId) return doc.toString()
  if (typeof doc !== 'object') return doc

  const input = doc as AnyRecord
  const out: AnyRecord = {}

  for (const [key, value] of Object.entries(input)) {
    if (key === '__v') continue
    if (key === '_id') {
      out.id = value instanceof mongoose.Types.ObjectId ? value.toString() : String(value)
      continue
    }
    if ((key.endsWith('Id') || key === 'userId' || key === 'categoryId' || key === 'orderId' || key === 'productId') && value instanceof mongoose.Types.ObjectId) {
      out[key] = value.toString()
      continue
    }
    out[key] = serialize(value)
  }

  return out
}

function mapData(data: AnyRecord = {}) {
  const out: AnyRecord = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    if (key === 'id') continue
    out[key] = toObjectId(value)
  }
  return out
}

async function withDb<T>(fn: () => Promise<T>): Promise<T> {
  await connectMongo()
  return fn()
}

function createDelegate(model: Model<any>, options?: { productCount?: boolean }) {
  return {
    async findMany(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        let query = model.find(filter)

        const sort = mapOrderBy(args.orderBy as AnyRecord | AnyRecord[])
        if (sort) query = query.sort(sort)
        if (typeof args.take === 'number') query = query.limit(args.take)
        if (args.select) query = query.select(Object.keys(args.select as AnyRecord).join(' '))

        const include = (args.include || {}) as AnyRecord
        if (include.category) query = query.populate('categoryId')
        if (include.items) {
          // handled after for Order
        }
        if (include.user) query = query.populate('userId')

        const rows = await query.lean()
        let result = rows.map(row => {
          const serialized = serialize(row) as AnyRecord
          if (include.category && row.categoryId && typeof row.categoryId === 'object') {
            serialized.category = serialize(row.categoryId)
            serialized.categoryId =
              (row.categoryId as AnyRecord)._id?.toString?.() || serialized.categoryId
          }
          if (include.user && row.userId && typeof row.userId === 'object') {
            serialized.user = serialize(row.userId)
            serialized.userId = (row.userId as AnyRecord)._id?.toString?.() || serialized.userId
          }
          return serialized
        })

        if (include.items) {
          result = await Promise.all(
            result.map(async order => {
              let items = await OrderItem.find({ orderId: order.id }).lean()
              const itemsInclude = include.items as AnyRecord
              if (itemsInclude && typeof itemsInclude === 'object' && itemsInclude.include?.product) {
                items = await OrderItem.find({ orderId: order.id }).populate('productId').lean()
                return {
                  ...order,
                  items: items.map(item => {
                    const serialized = serialize(item) as AnyRecord
                    if (item.productId && typeof item.productId === 'object') {
                      serialized.product = serialize(item.productId)
                      serialized.productId =
                        (item.productId as AnyRecord)._id?.toString?.() || serialized.productId
                    }
                    return serialized
                  }),
                }
              }
              return { ...order, items: items.map(serialize) }
            }),
          )
        }

        if (include._count && options?.productCount) {
          result = await Promise.all(
            result.map(async category => {
              const products = await Product.countDocuments({ categoryId: category.id })
              return { ...category, _count: { products } }
            }),
          )
        }

        return result
      })
    },

    async findUnique(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        let query = model.findOne(filter)
        const include = (args.include || {}) as AnyRecord
        if (include.category) query = query.populate('categoryId')
        if (include._count && options?.productCount) {
          // added below
        }
        const row = await query.lean()
        if (!row) return null
        const serialized = serialize(row) as AnyRecord
        if (include.category && row.categoryId && typeof row.categoryId === 'object') {
          serialized.category = serialize(row.categoryId)
          serialized.categoryId =
            (row.categoryId as AnyRecord)._id?.toString?.() || serialized.categoryId
        }
        if (include._count && options?.productCount) {
          serialized._count = {
            products: await Product.countDocuments({ categoryId: serialized.id }),
          }
        }
        if (include.items) {
          const items = await OrderItem.find({ orderId: serialized.id }).lean()
          serialized.items = items.map(serialize)
        }
        return serialized
      })
    },

    async findFirst(args: AnyRecord = {}) {
      const rows = await this.findMany({ ...args, take: 1 })
      return rows[0] || null
    },

    async create(args: AnyRecord = {}) {
      return withDb(async () => {
        const rawData = { ...((args.data as AnyRecord) || {}) }
        const include = (args.include || {}) as AnyRecord
        const nestedItems = rawData.items as AnyRecord | undefined
        delete rawData.items

        const data = mapData(rawData)

        if (nestedItems && typeof nestedItems === 'object' && 'create' in nestedItems) {
          const order = await model.create(data)
          const itemsData = nestedItems.create
          const items = Array.isArray(itemsData) ? itemsData : [itemsData]
          await OrderItem.insertMany(
            items.map((item: AnyRecord) => ({
              ...mapData(item),
              orderId: order._id,
            })),
          )
          return this.findUnique({
            where: { id: order._id.toString() },
            include: include.items ? { items: true } : include,
          })
        }

        const created = await model.create(data)
        return this.findUnique({
          where: { id: created._id.toString() },
          include: args.include,
        })
      })
    },

    async createMany(args: AnyRecord = {}) {
      return withDb(async () => {
        const data = ((args.data as AnyRecord[]) || []).map(mapData)
        const result = await model.insertMany(data, { ordered: false })
        return { count: result.length }
      })
    },

    async update(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        const data = mapData((args.data as AnyRecord) || {})
        await model.updateOne(filter, { $set: data })
        return this.findUnique({ where: args.where, include: args.include })
      })
    },

    async updateMany(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        const data = mapData((args.data as AnyRecord) || {})
        const result = await model.updateMany(filter, { $set: data })
        return { count: result.modifiedCount }
      })
    },

    async delete(args: AnyRecord = {}) {
      return withDb(async () => {
        const existing = await this.findUnique({ where: args.where })
        const filter = mapWhere((args.where as AnyRecord) || {})
        await model.deleteOne(filter)
        return existing
      })
    },

    async deleteMany(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        const result = await model.deleteMany(filter)
        return { count: result.deletedCount || 0 }
      })
    },

    async count(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        return model.countDocuments(filter)
      })
    },

    async aggregate(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        const sumFields = Object.keys((args._sum as AnyRecord) || {})
        if (sumFields.length === 0) {
          return { _sum: {} }
        }

        const group: AnyRecord = { _id: null }
        for (const field of sumFields) {
          group[field] = { $sum: `$${field}` }
        }

        const rows = await model.aggregate([{ $match: filter }, { $group: group }])
        const row = rows[0] || {}
        const _sum: AnyRecord = {}
        for (const field of sumFields) {
          _sum[field] = row[field] ?? null
        }
        return { _sum }
      })
    },

    async groupBy(args: AnyRecord = {}) {
      return withDb(async () => {
        const filter = mapWhere((args.where as AnyRecord) || {})
        const by = args.by as string[]
        const groupId: AnyRecord = {}
        for (const field of by) groupId[field] = `$${field}`

        const group: AnyRecord = { _id: groupId }
        const countFields = Object.keys((args._count as AnyRecord) || {})
        for (const field of countFields) {
          group[`${field}_count`] = { $sum: 1 }
        }
        const sumFields = Object.keys((args._sum as AnyRecord) || {})
        for (const field of sumFields) {
          group[`${field}_sum`] = { $sum: `$${field}` }
        }

        const pipeline: AnyRecord[] = [{ $match: filter }, { $group: group }]

        if (args.orderBy) {
          const orderBy = args.orderBy as AnyRecord
          if (orderBy._count && typeof orderBy._count === 'object') {
            const countSort: AnyRecord = {}
            for (const [field, direction] of Object.entries(orderBy._count as AnyRecord)) {
              countSort[`${field}_count`] = direction === 'desc' ? -1 : 1
            }
            pipeline.push({ $sort: countSort })
          } else {
            const sort = mapOrderBy(orderBy as AnyRecord | AnyRecord[])
            if (sort) pipeline.push({ $sort: sort })
          }
        }

        if (typeof args.take === 'number') {
          pipeline.push({ $limit: args.take })
        }

        const rows = await model.aggregate(pipeline)
        return rows.map(row => {
          const out: AnyRecord = {}
          for (const field of by) {
            out[field] = row._id?.[field]
          }
          if (countFields.length) {
            out._count = {}
            for (const field of countFields) {
              ;(out._count as AnyRecord)[field] = row[`${field}_count`] || 0
            }
          }
          if (sumFields.length) {
            out._sum = {}
            for (const field of sumFields) {
              ;(out._sum as AnyRecord)[field] = row[`${field}_sum`] ?? null
            }
          }
          return out
        })
      })
    },
  }
}

export const db = {
  category: createDelegate(Category, { productCount: true }),
  product: createDelegate(Product),
  order: createDelegate(Order),
  orderItem: createDelegate(OrderItem),
  user: createDelegate(User),
  account: createDelegate(Account),
  session: createDelegate(Session),
  verificationToken: createDelegate(VerificationToken),
  siteEvent: createDelegate(SiteEvent),
  coupon: createDelegate(Coupon),
}

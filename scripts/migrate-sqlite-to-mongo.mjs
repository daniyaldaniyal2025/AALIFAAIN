import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const sqlitePath = join(process.cwd(), 'db', 'custom.db')

if (!existsSync(sqlitePath)) {
  console.error(`SQLite database not found at ${sqlitePath}`)
  process.exit(1)
}

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set')
  process.exit(1)
}

const sqlite = new Database(sqlitePath, { readonly: true })
const mongo = new PrismaClient()

function tableExists(name) {
  const row = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name)
  return Boolean(row)
}

function readAll(table) {
  if (!tableExists(table)) {
    console.log(`Skipping missing table: ${table}`)
    return []
  }
  return sqlite.prepare(`SELECT * FROM "${table}"`).all()
}

function toDate(value) {
  if (!value) return undefined
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function toBool(value) {
  return value === 1 || value === true || value === '1'
}

async function clearMongo() {
  console.log('Clearing existing MongoDB collections in aalifan...')
  await mongo.orderItem.deleteMany({})
  await mongo.order.deleteMany({})
  await mongo.product.deleteMany({})
  await mongo.category.deleteMany({})
  await mongo.account.deleteMany({})
  await mongo.session.deleteMany({})
  await mongo.verificationToken.deleteMany({})
  await mongo.siteEvent.deleteMany({})
  await mongo.coupon.deleteMany({})
  await mongo.user.deleteMany({})
}

async function migrate() {
  const counts = {}

  await clearMongo()

  const categoryIdMap = new Map()
  const userIdMap = new Map()
  const productIdMap = new Map()
  const orderIdMap = new Map()

  const categories = readAll('Category')
  for (const row of categories) {
    const created = await mongo.category.create({
      data: {
        name: row.name,
        slug: row.slug,
        description: row.description ?? null,
        image: row.image ?? null,
        status: row.status || 'active',
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
      },
    })
    categoryIdMap.set(row.id, created.id)
  }
  counts.Category = categories.length

  const users = readAll('User')
  for (const row of users) {
    const phone = typeof row.phone === 'string' ? row.phone.trim() : row.phone
    const created = await mongo.user.create({
      data: {
        name: row.name,
        email: row.email,
        // Omit empty phones — Mongo unique index only allows one null
        ...(phone ? { phone } : {}),
        password: row.password,
        image: row.image ?? null,
        role: row.role || 'customer',
        adminRole: row.adminRole || 'sub_admin',
        permissions: row.permissions || '{}',
        emailVerified: toDate(row.emailVerified) || null,
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
      },
    })
    userIdMap.set(row.id, created.id)
  }
  counts.User = users.length

  const products = readAll('Product')
  for (const row of products) {
    const categoryId = categoryIdMap.get(row.categoryId)
    if (!categoryId) {
      console.warn(`Skipping product ${row.slug}: missing category ${row.categoryId}`)
      continue
    }
    const created = await mongo.product.create({
      data: {
        name: row.name,
        slug: row.slug,
        description: row.description ?? null,
        price: row.price,
        image: row.image ?? null,
        images: row.images ?? '[]',
        categoryId,
        featured: toBool(row.featured),
        discount: row.discount ?? 0,
        stock: row.stock ?? 100,
        status: row.status || 'active',
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
      },
    })
    productIdMap.set(row.id, created.id)
  }
  counts.Product = productIdMap.size

  const coupons = readAll('Coupon')
  for (const row of coupons) {
    await mongo.coupon.create({
      data: {
        code: row.code,
        description: row.description ?? null,
        discountType: row.discountType || 'percent',
        discountValue: row.discountValue,
        minOrderTotal: row.minOrderTotal ?? 0,
        maxUses: row.maxUses ?? null,
        usedCount: row.usedCount ?? 0,
        active: toBool(row.active),
        expiresAt: toDate(row.expiresAt) || null,
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
      },
    })
  }
  counts.Coupon = coupons.length

  const orders = readAll('Order')
  for (const row of orders) {
    const created = await mongo.order.create({
      data: {
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        customerPhone: row.customerPhone ?? null,
        total: row.total,
        couponCode: row.couponCode ?? null,
        discountAmount: row.discountAmount ?? 0,
        status: row.status || 'pending',
        currency: row.currency || 'SAR',
        country: row.country || 'SA',
        paymentMethod: row.paymentMethod || 'cod',
        paymentStatus: row.paymentStatus || 'pending',
        transactionId: row.transactionId ?? null,
        cardLast4: row.cardLast4 ?? null,
        paidAt: toDate(row.paidAt) || null,
        userId: row.userId ? userIdMap.get(row.userId) || null : null,
        createdAt: toDate(row.createdAt) || new Date(),
        updatedAt: toDate(row.updatedAt) || new Date(),
      },
    })
    orderIdMap.set(row.id, created.id)
  }
  counts.Order = orders.length

  const orderItems = readAll('OrderItem')
  let migratedItems = 0
  for (const row of orderItems) {
    const orderId = orderIdMap.get(row.orderId)
    const productId = productIdMap.get(row.productId)
    if (!orderId || !productId) {
      console.warn(`Skipping OrderItem ${row.id}: missing relations`)
      continue
    }
    await mongo.orderItem.create({
      data: {
        orderId,
        productId,
        name: row.name,
        quantity: row.quantity,
        price: row.price,
      },
    })
    migratedItems += 1
  }
  counts.OrderItem = migratedItems

  const accounts = readAll('Account')
  for (const row of accounts) {
    const userId = userIdMap.get(row.userId)
    if (!userId) continue
    await mongo.account.create({
      data: {
        userId,
        type: row.type,
        provider: row.provider,
        providerAccountId: row.providerAccountId,
        refresh_token: row.refresh_token ?? null,
        access_token: row.access_token ?? null,
        expires_at: row.expires_at ?? null,
        token_type: row.token_type ?? null,
        scope: row.scope ?? null,
        id_token: row.id_token ?? null,
        session_state: row.session_state ?? null,
      },
    })
  }
  counts.Account = accounts.length

  const sessions = readAll('Session')
  for (const row of sessions) {
    const userId = userIdMap.get(row.userId)
    if (!userId) continue
    await mongo.session.create({
      data: {
        sessionToken: row.sessionToken,
        userId,
        expires: toDate(row.expires) || new Date(),
      },
    })
  }
  counts.Session = sessions.length

  const tokens = readAll('VerificationToken')
  for (const row of tokens) {
    await mongo.verificationToken.create({
      data: {
        identifier: row.identifier,
        token: row.token,
        expires: toDate(row.expires) || new Date(),
      },
    })
  }
  counts.VerificationToken = tokens.length

  const events = readAll('SiteEvent')
  for (const row of events) {
    await mongo.siteEvent.create({
      data: {
        type: row.type,
        page: row.page,
        sessionId: row.sessionId,
        userId: row.userId ? userIdMap.get(row.userId) || row.userId : null,
        country: row.country ?? null,
        meta: row.meta ?? null,
        createdAt: toDate(row.createdAt) || new Date(),
      },
    })
  }
  counts.SiteEvent = events.length

  console.log('\nMigration complete:')
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table}: ${count}`)
  }

  const mongoCounts = {
    Category: await mongo.category.count(),
    Product: await mongo.product.count(),
    User: await mongo.user.count(),
    Order: await mongo.order.count(),
    OrderItem: await mongo.orderItem.count(),
    Coupon: await mongo.coupon.count(),
    SiteEvent: await mongo.siteEvent.count(),
    Account: await mongo.account.count(),
    Session: await mongo.session.count(),
    VerificationToken: await mongo.verificationToken.count(),
  }

  console.log('\nMongoDB verification counts:')
  for (const [table, count] of Object.entries(mongoCounts)) {
    console.log(`  ${table}: ${count}`)
  }
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    sqlite.close()
    await mongo.$disconnect()
  })

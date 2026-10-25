import mongoose from 'mongoose'
import { connectMongo } from '@/lib/mongo'
import { Order, OrderItem, Product, StockMovement } from '@/lib/models'

type ProductLike = {
  id: string
  stock: number
  initialStock?: number | null
  totalSold?: number | null
  totalRestocked?: number | null
  totalAdjusted?: number | null
}

const CLOSED = ['cancelled', 'refunded']

async function soldQuantity(productId: string) {
  const closed = await Order.find({ status: { $in: CLOSED } }).select('_id').lean()
  const match: Record<string, unknown> = {
    productId: new mongoose.Types.ObjectId(productId),
  }
  if (closed.length > 0) {
    match.orderId = { $nin: closed.map(order => order._id) }
  }
  const rows = await OrderItem.aggregate([
    { $match: match },
    { $group: { _id: null, qty: { $sum: '$quantity' } } },
  ])
  return Number(rows[0]?.qty || 0)
}

export async function ensureProductBaseline<T extends ProductLike>(product: T): Promise<T> {
  if (typeof product.initialStock === 'number') return product
  await connectMongo()

  const sold = await soldQuantity(product.id)
  const initialStock = Math.max(0, Number(product.stock || 0) + sold)

  const updated = await Product.findOneAndUpdate(
    {
      _id: product.id,
      $or: [{ initialStock: { $exists: false } }, { initialStock: null }],
    },
    {
      $set: {
        initialStock,
        totalSold: sold,
        totalRestocked: product.totalRestocked || 0,
        totalAdjusted: product.totalAdjusted || 0,
      },
    },
    { new: true },
  ).lean()

  if (!updated) {
    const fresh = await Product.findById(product.id).lean()
    if (!fresh) return product
    return {
      ...product,
      stock: fresh.stock,
      initialStock: fresh.initialStock ?? initialStock,
      totalSold: fresh.totalSold ?? sold,
      totalRestocked: fresh.totalRestocked ?? 0,
      totalAdjusted: fresh.totalAdjusted ?? 0,
    }
  }

  const existingMove = await StockMovement.findOne({ productId: product.id, type: 'initial' }).lean()
  if (!existingMove) {
    await StockMovement.create({
      productId: product.id,
      type: 'initial',
      quantity: initialStock,
      stockBefore: 0,
      stockAfter: initialStock,
      note: 'Opening stock',
    })
  }

  return {
    ...product,
    stock: updated.stock,
    initialStock: updated.initialStock ?? initialStock,
    totalSold: updated.totalSold ?? sold,
    totalRestocked: updated.totalRestocked ?? 0,
    totalAdjusted: updated.totalAdjusted ?? 0,
  }
}

export async function recordOpeningStock(productId: string, quantity: number) {
  await connectMongo()
  await StockMovement.create({
    productId,
    type: 'initial',
    quantity,
    stockBefore: 0,
    stockAfter: quantity,
    note: 'Opening stock',
  })
}

export async function recordStockChange(productId: string, previousStock: number, nextStock: number) {
  const diff = nextStock - previousStock
  if (!diff) return
  await connectMongo()

  if (diff > 0) {
    await Product.updateOne({ _id: productId }, { $inc: { totalRestocked: diff } })
    await StockMovement.create({
      productId,
      type: 'restock',
      quantity: diff,
      stockBefore: previousStock,
      stockAfter: nextStock,
      note: `Added ${diff} to stock`,
    })
    return
  }

  const removed = Math.abs(diff)
  await Product.updateOne({ _id: productId }, { $inc: { totalAdjusted: removed } })
  await StockMovement.create({
    productId,
    type: 'adjustment',
    quantity: removed,
    stockBefore: previousStock,
    stockAfter: nextStock,
    note: `Stock reduced by ${removed}`,
  })
}

export async function applyOrderStock(orderId: string) {
  await connectMongo()
  const order = await Order.findById(orderId)
  if (!order || order.stockApplied) return

  const items = await OrderItem.find({ orderId: order._id }).lean()
  for (const item of items) {
    const current = await Product.findById(item.productId)
    if (!current) continue
    const before = current.stock
    const after = Math.max(0, before - item.quantity)
    current.stock = after
    current.totalSold = (current.totalSold || 0) + item.quantity
    await current.save()
    await StockMovement.create({
      productId: current._id,
      orderId: order._id,
      type: 'sale',
      quantity: item.quantity,
      stockBefore: before,
      stockAfter: after,
      note: `Sold ${item.quantity}`,
    })
  }

  order.stockApplied = true
  await order.save()
}

export async function restoreOrderStock(orderId: string) {
  await connectMongo()
  const order = await Order.findById(orderId)
  if (!order || !order.stockApplied || order.stockRestored) return

  const items = await OrderItem.find({ orderId: order._id }).lean()
  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (!product) continue
    const before = product.stock
    const after = before + item.quantity
    product.stock = after
    product.totalSold = Math.max(0, (product.totalSold || 0) - item.quantity)
    await product.save()
    await StockMovement.create({
      productId: product._id,
      orderId: order._id,
      type: 'return',
      quantity: item.quantity,
      stockBefore: before,
      stockAfter: after,
      note: 'Returned to stock after cancellation',
    })
  }

  order.stockRestored = true
  await order.save()
}

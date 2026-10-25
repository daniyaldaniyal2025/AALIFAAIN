import { db } from '@/lib/db'

type Line = {
  productId: string
  name: string
  quantity: number
  price: number
  costPrice: number
}

function isOpenOrder(status: string) {
  return status !== 'cancelled' && status !== 'refunded'
}

export async function GET() {
  try {
    const [orders, products] = await Promise.all([
      db.order.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      db.product.findMany(),
    ])

    const costByProduct = new Map(products.map(product => [product.id, product.costPrice || 0]))
    const nameByProduct = new Map(products.map(product => [product.id, product.name]))

    const productMap = new Map<string, {
      productId: string
      name: string
      quantity: number
      revenue: number
      cost: number
    }>()

    const orderRows = []
    let revenue = 0
    let cost = 0

    for (const order of orders) {
      if (!isOpenOrder(order.status)) continue
      const items = (order.items || []) as Line[]
      const lineRevenue = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const discount = order.discountAmount || Math.max(0, lineRevenue - order.total)
      let orderCost = 0

      for (const item of items) {
        const unitCost = item.costPrice || costByProduct.get(item.productId) || 0
        const itemRevenue = item.price * item.quantity
        const share = lineRevenue > 0 ? itemRevenue / lineRevenue : 0
        const netRevenue = itemRevenue - discount * share
        const itemCost = unitCost * item.quantity
        orderCost += itemCost

        const current = productMap.get(item.productId) || {
          productId: item.productId,
          name: item.name || nameByProduct.get(item.productId) || 'Product',
          quantity: 0,
          revenue: 0,
          cost: 0,
        }
        current.quantity += item.quantity
        current.revenue += netRevenue
        current.cost += itemCost
        productMap.set(item.productId, current)
      }

      const orderProfit = order.total - orderCost
      revenue += order.total
      cost += orderCost
      orderRows.push({
        id: order.id,
        createdAt: order.createdAt,
        customerName: order.customerName,
        status: order.status,
        revenue: order.total,
        cost: orderCost,
        profit: orderProfit,
      })
    }

    const byProduct = Array.from(productMap.values())
      .map(row => ({ ...row, profit: row.revenue - row.cost }))
      .sort((a, b) => b.profit - a.profit)

    const profit = revenue - cost

    return Response.json({
      summary: {
        revenue,
        cost,
        profit,
        orders: orderRows.length,
      },
      byProduct,
      byOrder: orderRows,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to load profit and loss' }, { status: 500 })
  }
}

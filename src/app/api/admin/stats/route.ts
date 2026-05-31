import { db } from '@/lib/db'

export async function GET() {
  try {
    const stats = await Promise.all([
      db.product.count(),
      db.order.count(),
      db.order.aggregate({ _sum: { total: true } }),
      db.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      db.category.findMany({
        include: { _count: { select: { products: true } } },
      }),
    ])

    const recentOrders = await db.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    })

    const monthlyRevenue = await db.$queryRaw<Array<{ month: string; revenue: number }>>`
      SELECT strftime('%Y-%m', createdAt) as month, SUM(total) as revenue
      FROM \`Order\`
      GROUP BY strftime('%Y-%m', createdAt)
      ORDER BY month DESC
      LIMIT 12
    `

    return Response.json({
      totalProducts: stats[0],
      totalOrders: stats[1],
      totalRevenue: stats[2]._sum.total || 0,
      ordersByStatus: stats[3],
      categories: stats[4],
      recentOrders,
      monthlyRevenue,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

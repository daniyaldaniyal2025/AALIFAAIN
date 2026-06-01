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

    // Payment stats
    const paymentStats = await db.order.groupBy({
      by: ['paymentStatus'],
      _count: { paymentStatus: true },
      _sum: { total: true },
    })

    const paymentMethodStats = await db.order.groupBy({
      by: ['paymentMethod'],
      _count: { paymentMethod: true },
      _sum: { total: true },
    })

    const paidRevenue = await db.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: 'paid' },
    })

    const pendingPayments = await db.order.aggregate({
      _sum: { total: true },
      where: { paymentStatus: 'pending' },
    })

    return Response.json({
      totalProducts: stats[0],
      totalOrders: stats[1],
      totalRevenue: stats[2]._sum.total || 0,
      ordersByStatus: stats[3],
      categories: stats[4],
      recentOrders,
      monthlyRevenue,
      paymentStats: paymentStats.map(ps => ({
        status: ps.paymentStatus,
        count: ps._count.paymentStatus,
        total: ps._sum.total || 0,
      })),
      paymentMethodStats: paymentMethodStats.map(pms => ({
        method: pms.paymentMethod,
        count: pms._count.paymentMethod,
        total: pms._sum.total || 0,
      })),
      paidRevenue: paidRevenue._sum.total || 0,
      pendingPayments: pendingPayments._sum.total || 0,
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

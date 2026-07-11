import { db } from '@/lib/db'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

export async function GET() {
  try {
    const since30Days = daysAgo(30)

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

    // Customer engagement metrics
    const [
      totalCustomers,
      newCustomers30d,
      pageViews30d,
      uniqueVisitorsRow,
      dailyEngagement,
      topPagesRaw,
      signIns30d,
      signUps30d,
      addToCart30d,
      checkouts30d,
      orders30d,
      returningCustomers,
    ] = await Promise.all([
      db.user.count({ where: { role: 'customer' } }),
      db.user.count({ where: { role: 'customer', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'page_view', createdAt: { gte: since30Days }, NOT: { page: { startsWith: 'admin' } } } }),
      db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT sessionId) as count
        FROM SiteEvent
        WHERE createdAt >= ${since30Days.toISOString()}
      `,
      db.$queryRaw<Array<{ day: string; pageViews: number; uniqueVisitors: number }>>`
        SELECT
          date(createdAt) as day,
          SUM(CASE WHEN type = 'page_view' THEN 1 ELSE 0 END) as pageViews,
          COUNT(DISTINCT sessionId) as uniqueVisitors
        FROM SiteEvent
        WHERE createdAt >= date('now', '-14 days')
        GROUP BY date(createdAt)
        ORDER BY day ASC
      `,
      db.siteEvent.groupBy({
        by: ['page'],
        where: { type: 'page_view', createdAt: { gte: since30Days }, NOT: { page: { startsWith: 'admin' } } },
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 8,
      }),
      db.siteEvent.count({ where: { type: 'sign_in', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'sign_up', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'add_to_cart', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'checkout', createdAt: { gte: since30Days } } }),
      db.order.count({ where: { createdAt: { gte: since30Days } } }),
      db.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM (
          SELECT sessionId
          FROM SiteEvent
          WHERE type = 'page_view' AND createdAt >= ${since30Days.toISOString()}
          GROUP BY sessionId
          HAVING COUNT(*) > 1
        )
      `,
    ])

    const uniqueVisitors30d = Number(uniqueVisitorsRow[0]?.count ?? 0)
    const returningVisitors = Number(returningCustomers[0]?.count ?? 0)
    const conversionRate = pageViews30d > 0 ? Math.round((orders30d / pageViews30d) * 1000) / 10 : 0

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
      engagement: {
        totalCustomers,
        newCustomers30d,
        pageViews30d,
        uniqueVisitors30d,
        returningVisitors,
        signIns30d,
        signUps30d,
        addToCart30d,
        checkouts30d,
        orders30d,
        conversionRate,
        dailyEngagement: dailyEngagement.map(row => ({
          day: row.day,
          pageViews: Number(row.pageViews) || 0,
          uniqueVisitors: Number(row.uniqueVisitors) || 0,
        })),
        topPages: topPagesRaw.map(row => ({
          page: row.page,
          views: row._count.page,
        })),
        funnel: [
          { step: 'Page Views', count: pageViews30d },
          { step: 'Add to Cart', count: addToCart30d },
          { step: 'Checkout', count: checkouts30d },
          { step: 'Orders', count: orders30d },
        ],
      },
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

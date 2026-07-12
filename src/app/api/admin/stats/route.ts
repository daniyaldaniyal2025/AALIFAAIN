import { db } from '@/lib/db'

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function toMonthKey(date: Date) {
  return date.toISOString().slice(0, 7)
}

export async function GET() {
  try {
    const since30Days = daysAgo(30)
    const since14Days = daysAgo(14)

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

    const ordersForRevenue = await db.order.findMany({
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'desc' },
    })

    const monthlyMap = new Map<string, number>()
    for (const order of ordersForRevenue) {
      const month = toMonthKey(new Date(order.createdAt))
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + order.total)
    }
    const monthlyRevenue = Array.from(monthlyMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12)

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

    const [
      totalCustomers,
      newCustomers30d,
      pageViews30d,
      events30d,
      events14d,
      topPagesRaw,
      signIns30d,
      signUps30d,
      addToCart30d,
      checkouts30d,
      orders30d,
    ] = await Promise.all([
      db.user.count({ where: { role: 'customer' } }),
      db.user.count({ where: { role: 'customer', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({
        where: {
          type: 'page_view',
          createdAt: { gte: since30Days },
          NOT: { page: { startsWith: 'admin' } },
        },
      }),
      db.siteEvent.findMany({
        where: { createdAt: { gte: since30Days } },
        select: { type: true, sessionId: true, createdAt: true },
      }),
      db.siteEvent.findMany({
        where: { createdAt: { gte: since14Days } },
        select: { type: true, sessionId: true, createdAt: true },
      }),
      db.siteEvent.groupBy({
        by: ['page'],
        where: {
          type: 'page_view',
          createdAt: { gte: since30Days },
          NOT: { page: { startsWith: 'admin' } },
        },
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 8,
      }),
      db.siteEvent.count({ where: { type: 'sign_in', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'sign_up', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'add_to_cart', createdAt: { gte: since30Days } } }),
      db.siteEvent.count({ where: { type: 'checkout', createdAt: { gte: since30Days } } }),
      db.order.count({ where: { createdAt: { gte: since30Days } } }),
    ])

    const uniqueSessions30d = new Set(events30d.map(e => e.sessionId))
    const uniqueVisitors30d = uniqueSessions30d.size

    const sessionViewCounts = new Map<string, number>()
    for (const event of events30d) {
      if (event.type !== 'page_view') continue
      sessionViewCounts.set(event.sessionId, (sessionViewCounts.get(event.sessionId) || 0) + 1)
    }
    const returningVisitors = Array.from(sessionViewCounts.values()).filter(count => count > 1).length

    const dailyMap = new Map<string, { pageViews: number; sessions: Set<string> }>()
    for (const event of events14d) {
      const day = toDayKey(new Date(event.createdAt))
      if (!dailyMap.has(day)) {
        dailyMap.set(day, { pageViews: 0, sessions: new Set() })
      }
      const bucket = dailyMap.get(day)!
      if (event.type === 'page_view') bucket.pageViews += 1
      bucket.sessions.add(event.sessionId)
    }
    const dailyEngagement = Array.from(dailyMap.entries())
      .map(([day, value]) => ({
        day,
        pageViews: value.pageViews,
        uniqueVisitors: value.sessions.size,
      }))
      .sort((a, b) => a.day.localeCompare(b.day))

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
        dailyEngagement,
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

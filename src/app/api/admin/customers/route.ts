import { db } from '@/lib/db'

type CustomerRow = {
  email: string
  name: string
  phone: string | null
  signedUp: boolean
  orders: number
  totalSpent: number
  firstSeen: string
  lastOrderAt: string | null
}

export async function GET() {
  try {
    const [users, orders] = await Promise.all([
      db.user.findMany({ where: { role: 'customer' }, orderBy: { createdAt: 'desc' } }),
      db.order.findMany({ orderBy: { createdAt: 'desc' } }),
    ])

    const byEmail = new Map<string, CustomerRow>()

    for (const user of users) {
      const email = String(user.email || '').trim().toLowerCase()
      if (!email) continue
      byEmail.set(email, {
        email,
        name: user.name,
        phone: user.phone || null,
        signedUp: true,
        orders: 0,
        totalSpent: 0,
        firstSeen: new Date(user.createdAt).toISOString(),
        lastOrderAt: null,
      })
    }

    for (const order of orders) {
      if (order.status === 'cancelled' || order.status === 'refunded') continue
      const email = String(order.customerEmail || '').trim().toLowerCase()
      if (!email) continue
      const existing = byEmail.get(email)
      const createdAt = new Date(order.createdAt).toISOString()
      if (!existing) {
        byEmail.set(email, {
          email,
          name: order.customerName,
          phone: order.customerPhone || null,
          signedUp: false,
          orders: 1,
          totalSpent: order.total || 0,
          firstSeen: createdAt,
          lastOrderAt: createdAt,
        })
        continue
      }
      existing.orders += 1
      existing.totalSpent += order.total || 0
      if (!existing.phone && order.customerPhone) existing.phone = order.customerPhone
      if (!existing.lastOrderAt || createdAt > existing.lastOrderAt) existing.lastOrderAt = createdAt
      if (createdAt < existing.firstSeen) existing.firstSeen = createdAt
    }

    const customers = Array.from(byEmail.values()).sort((a, b) => b.firstSeen.localeCompare(a.firstSeen))
    return Response.json({
      customers,
      totals: {
        customers: customers.length,
        signedUp: customers.filter(customer => customer.signedUp).length,
        buyers: customers.filter(customer => customer.orders > 0).length,
      },
    })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to load customers' }, { status: 500 })
  }
}

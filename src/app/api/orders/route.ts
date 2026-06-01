import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET() {
  try {
    const orders = await db.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json(orders)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { customerName, customerEmail, customerPhone, items, currency, country, paymentMethod } = body

    const total = items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + item.price * item.quantity
    }, 0)

    const order = await db.order.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        total,
        currency: currency || 'SAR',
        country: country || 'SA',
        paymentMethod: paymentMethod || 'cod',
        paymentStatus: 'pending',
        items: {
          create: items.map((item: { productId: string; name: string; price: number; quantity: number }) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    })

    return Response.json(order, { status: 201 })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to create order' }, { status: 500 })
  }
}

// PUT /api/orders - Update order status (admin action)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, status, paymentStatus } = body

    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus
      if (paymentStatus === 'paid' && !order.paidAt) {
        updateData.paidAt = new Date()
      }
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: updateData,
      include: { items: true },
    })

    return Response.json(updated)
  } catch (error) {
    console.error('Order update error:', error)
    return Response.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

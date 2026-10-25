import { db } from '@/lib/db'
import { NextRequest } from 'next/server'
import { validateCouponCode, applyCouponUsage } from '@/lib/coupons'
import { applyOrderStock, ensureProductBaseline, restoreOrderStock } from '@/lib/inventory'

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
    const { customerName, customerEmail, customerPhone, items, currency, country, paymentMethod, couponCode } = body

    const subtotal = items.reduce((sum: number, item: { price: number; quantity: number }) => {
      return sum + item.price * item.quantity
    }, 0)

    let discountAmount = 0
    let appliedCouponCode: string | null = null

    if (couponCode) {
      const couponResult = await validateCouponCode(couponCode, subtotal)
      if ('error' in couponResult) {
        return Response.json({ error: couponResult.error }, { status: 400 })
      }
      discountAmount = couponResult.coupon.discountAmount
      appliedCouponCode = couponResult.coupon.code
    }

    const total = Math.max(0, subtotal - discountAmount)
    const normalizedEmail = String(customerEmail || '').trim().toLowerCase()
    const buyer = normalizedEmail
      ? await db.user.findUnique({ where: { email: normalizedEmail } })
      : null

    const catalog = await db.product.findMany({
      where: { id: { in: items.map((item: { productId: string }) => item.productId) } },
    })
    for (const product of catalog) {
      await ensureProductBaseline(product)
    }
    const costById = new Map(catalog.map(product => [product.id, product.costPrice || 0]))

    const order = await db.order.create({
      data: {
        customerName,
        customerEmail: normalizedEmail || customerEmail,
        customerPhone,
        total,
        couponCode: appliedCouponCode,
        discountAmount,
        currency: currency || 'SAR',
        country: country || 'SA',
        paymentMethod: paymentMethod || 'cod',
        paymentStatus: 'pending',
        userId: buyer?.id,
        stockApplied: false,
        stockRestored: false,
        items: {
          create: items.map((item: { productId: string; name: string; price: number; quantity: number }) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            costPrice: costById.get(item.productId) || 0,
          })),
        },
      },
      include: { items: true },
    })

    await applyOrderStock(order.id)

    if (appliedCouponCode) {
      await applyCouponUsage(appliedCouponCode)
    }

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

    const nextStatus = status || order.status
    const wasClosed = order.status === 'cancelled' || order.status === 'refunded'
    const nowClosed = nextStatus === 'cancelled' || nextStatus === 'refunded'
    if (!wasClosed && nowClosed) {
      await restoreOrderStock(orderId)
    }

    return Response.json(updated)
  } catch (error) {
    console.error('Order update error:', error)
    return Response.json({ error: 'Failed to update order' }, { status: 500 })
  }
}

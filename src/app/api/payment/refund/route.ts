import { db } from '@/lib/db'

// POST /api/payment/refund - Refund a payment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, reason } = body

    if (!orderId) {
      return Response.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.paymentStatus !== 'paid') {
      return Response.json({ error: 'Only paid orders can be refunded' }, { status: 400 })
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'refunded',
        status: 'cancelled',
      },
    })

    return Response.json({
      success: true,
      message: `Refund processed for order ${orderId}${reason ? `. Reason: ${reason}` : ''}`,
      refundAmount: order.total,
      transactionId: order.transactionId,
      order: updated,
    })
  } catch (error) {
    console.error('Refund error:', error)
    return Response.json({ error: 'Refund processing failed' }, { status: 500 })
  }
}

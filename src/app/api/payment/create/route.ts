import { db } from '@/lib/db'

// POST /api/payment/create - Initialize a payment for an order
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, paymentMethod, cardLast4 } = body

    if (!orderId || !paymentMethod) {
      return Response.json({ error: 'Order ID and payment method are required' }, { status: 400 })
    }

    const order = await db.order.findUnique({ where: { id: orderId } })
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 })
    }

    // Generate a simulated transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // For Cash on Delivery - payment is pending until delivery
    if (paymentMethod === 'cod') {
      const updated = await db.order.update({
        where: { id: orderId },
        data: {
          paymentMethod: 'cod',
          paymentStatus: 'pending',
          transactionId,
          status: 'confirmed',
        },
      })
      return Response.json({
        success: true,
        paymentStatus: 'pending',
        transactionId,
        message: 'Order placed with Cash on Delivery',
        order: updated,
      })
    }

    // For Card / Apple Pay / Mada - simulate payment processing
    // In production, this would call a real payment gateway (Stripe, Moyasar, etc.)
    const isSuccess = Math.random() > 0.05 // 95% success rate simulation

    if (isSuccess) {
      const updated = await db.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
          paymentStatus: 'paid',
          transactionId,
          cardLast4: cardLast4 || null,
          paidAt: new Date(),
          status: 'confirmed',
        },
      })
      return Response.json({
        success: true,
        paymentStatus: 'paid',
        transactionId,
        message: 'Payment processed successfully',
        order: updated,
      })
    } else {
      const updated = await db.order.update({
        where: { id: orderId },
        data: {
          paymentMethod,
          paymentStatus: 'failed',
          transactionId,
          cardLast4: cardLast4 || null,
        },
      })
      return Response.json({
        success: false,
        paymentStatus: 'failed',
        transactionId,
        message: 'Payment was declined. Please try again.',
        order: updated,
      }, { status: 402 })
    }
  } catch (error) {
    console.error('Payment creation error:', error)
    return Response.json({ error: 'Payment processing failed' }, { status: 500 })
  }
}

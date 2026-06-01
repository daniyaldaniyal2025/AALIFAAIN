import { db } from '@/lib/db'

// GET /api/payment/verify?transactionId=xxx - Verify a payment by transaction ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get('transactionId')

    if (!transactionId) {
      return Response.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    const order = await db.order.findFirst({
      where: { transactionId },
      include: { items: true },
    })

    if (!order) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return Response.json({
      transactionId: order.transactionId,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      total: order.total,
      currency: order.currency,
      paidAt: order.paidAt,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      itemCount: order.items.length,
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return Response.json({ error: 'Verification failed' }, { status: 500 })
  }
}

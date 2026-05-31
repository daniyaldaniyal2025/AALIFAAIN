import { db } from '@/lib/db'

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
    const { customerName, customerEmail, customerPhone, items, currency, country } = body

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

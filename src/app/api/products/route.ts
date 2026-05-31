import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    return Response.json(products)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

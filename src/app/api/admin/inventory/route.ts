import { db } from '@/lib/db'
import { ensureProductBaseline } from '@/lib/inventory'

export async function GET(request: Request) {
  try {
    const productId = new URL(request.url).searchParams.get('productId')

    if (productId) {
      const product = await db.product.findUnique({
        where: { id: productId },
        include: { category: true },
      })
      if (!product) {
        return Response.json({ error: 'Product not found' }, { status: 404 })
      }
      const baselined = await ensureProductBaseline(product)
      const movements = await db.stockMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
      })
      return Response.json({ product: baselined, movements })
    }

    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    })
    const baselined = []
    for (const product of products) {
      baselined.push(await ensureProductBaseline(product))
    }
    return Response.json({ products: baselined })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'Failed to load inventory' }, { status: 500 })
  }
}

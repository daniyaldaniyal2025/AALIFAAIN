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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, price, image, categoryId, featured, stock, status } = body

    if (!name || !price || !categoryId) {
      return Response.json({ error: 'Name, price, and category are required' }, { status: 400 })
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Check for duplicate slug
    const existing = await db.product.findUnique({ where: { slug } })
    if (existing) {
      return Response.json({ error: 'A product with a similar name already exists' }, { status: 409 })
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: parseFloat(price),
        image: image || null,
        categoryId,
        featured: featured || false,
        stock: stock ? parseInt(stock) : 100,
        status: status || 'active',
      },
      include: { category: true },
    })

    return Response.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return Response.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

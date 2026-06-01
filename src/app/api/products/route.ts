import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    // Parse images JSON for each product
    const parsed = products.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
    }))
    return Response.json(parsed)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, price, image, images, categoryId, featured, discount, stock, status } = body

    if (!name || !price || !categoryId) {
      return Response.json({ error: 'Name, price, and category are required' }, { status: 400 })
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

    // Check for duplicate slug
    const existing = await db.product.findUnique({ where: { slug } })
    if (existing) {
      return Response.json({ error: 'A product with a similar name already exists' }, { status: 409 })
    }

    // Serialize images array to JSON string
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : '[]'
    // Use first image as primary if no primary image set
    const primaryImage = image || (Array.isArray(images) && images.length > 0 ? images[0] : null)

    const product = await db.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: parseFloat(price),
        image: primaryImage || null,
        images: imagesJson,
        categoryId,
        featured: featured || false,
        discount: discount ? parseInt(discount) : 0,
        stock: stock ? parseInt(stock) : 100,
        status: status || 'active',
      },
      include: { category: true },
    })

    // Return with parsed images
    return Response.json({ ...product, images: JSON.parse(product.images || '[]') }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return Response.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

import { db } from '@/lib/db'
import { ensureProductBaseline, recordOpeningStock } from '@/lib/inventory'

export async function GET() {
  try {
    const products = await db.product.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })
    const baselined = []
    for (const product of products) {
      baselined.push(await ensureProductBaseline(product))
    }
    // Parse images JSON for each product
    const parsed = baselined.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      lowStockThreshold: p.lowStockThreshold ?? 10,
      costPrice: p.costPrice ?? 0,
    }))
    return Response.json(parsed)
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return Response.json(
      { error: 'Failed to fetch products', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, price, costPrice, image, images, categoryId, featured, discount, stock, lowStockThreshold, status } = body

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
    const openingStock = stock ? parseInt(stock) : 100

    const product = await db.product.create({
      data: {
        name,
        slug,
        description: description || null,
        price: parseFloat(price),
        costPrice: costPrice ? parseFloat(costPrice) : 0,
        image: primaryImage || null,
        images: imagesJson,
        categoryId,
        featured: featured || false,
        discount: discount ? parseInt(discount) : 0,
        stock: openingStock,
        initialStock: openingStock,
        totalRestocked: 0,
        totalSold: 0,
        totalAdjusted: 0,
        lowStockThreshold: lowStockThreshold !== undefined && lowStockThreshold !== '' ? parseInt(lowStockThreshold) : 10,
        status: status || 'active',
      },
      include: { category: true },
    })

    await recordOpeningStock(product.id, openingStock)

    // Return with parsed images
    return Response.json({ ...product, images: JSON.parse(product.images || '[]') }, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return Response.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

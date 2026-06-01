import { db } from '@/lib/db'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
    return Response.json(categories)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, description, image, status } = body

    if (!name || !slug) {
      return Response.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check if slug already exists
    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) {
      return Response.json({ error: 'A category with this slug already exists' }, { status: 409 })
    }

    const category = await db.category.create({
      data: {
        name,
        slug,
        description: description || null,
        image: image || null,
        status: status || 'active',
      },
      include: { _count: { select: { products: true } } },
    })

    return Response.json(category, { status: 201 })
  } catch (error) {
    console.error('Failed to create category:', error)
    return Response.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

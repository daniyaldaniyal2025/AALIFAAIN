import { db } from '@/lib/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!category) {
      return Response.json({ error: 'Category not found' }, { status: 404 })
    }
    return Response.json(category)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, slug, description, image, status } = body

    // Check if category exists
    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: 'Category not found' }, { status: 404 })
    }

    // If slug is being changed, check for conflicts
    if (slug && slug !== existing.slug) {
      const slugConflict = await db.category.findUnique({ where: { slug } })
      if (slugConflict) {
        return Response.json({ error: 'A category with this slug already exists' }, { status: 409 })
      }
    }

    const category = await db.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description: description || null }),
        ...(image !== undefined && { image: image || null }),
        ...(status !== undefined && { status }),
      },
      include: { _count: { select: { products: true } } },
    })

    return Response.json(category)
  } catch (error) {
    console.error('Failed to update category:', error)
    return Response.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Check if category exists
    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!existing) {
      return Response.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has products
    if (existing._count.products > 0) {
      return Response.json({ error: `Cannot delete category "${existing.name}" — it has ${existing._count.products} product(s). Please move or delete the products first.` }, { status: 409 })
    }

    await db.category.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error('Failed to delete category:', error)
    return Response.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}

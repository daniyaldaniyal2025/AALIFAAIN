import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    })
    if (!product) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }
    return Response.json(product)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, price, image, categoryId, featured, stock, status } = body

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      updateData.name = name
      updateData.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    }
    if (description !== undefined) updateData.description = description || null
    if (price !== undefined) updateData.price = parseFloat(price)
    if (image !== undefined) updateData.image = image || null
    if (categoryId !== undefined) updateData.categoryId = categoryId
    if (featured !== undefined) updateData.featured = featured
    if (stock !== undefined) updateData.stock = parseInt(stock)
    if (status !== undefined) updateData.status = status

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    })

    return Response.json(product)
  } catch (error) {
    console.error('Update product error:', error)
    return Response.json({ error: 'Failed to update product' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return Response.json({ error: 'Product not found' }, { status: 404 })
    }

    // Delete order items referencing this product first
    await db.orderItem.deleteMany({ where: { productId: id } })

    await db.product.delete({ where: { id } })

    return Response.json({ success: true, message: 'Product deleted' })
  } catch (error) {
    console.error('Delete product error:', error)
    return Response.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}

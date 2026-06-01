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

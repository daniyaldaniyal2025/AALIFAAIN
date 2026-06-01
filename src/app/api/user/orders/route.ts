import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('alifaain-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionUser = verifySessionToken(token)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const orders = await db.order.findMany({
      where: { userId: sessionUser.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('User orders error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

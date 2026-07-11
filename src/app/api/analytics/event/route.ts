import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const ALLOWED_TYPES = new Set(['page_view', 'sign_in', 'sign_up', 'add_to_cart', 'checkout'])

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, page, sessionId, userId, country, meta } = body

    if (!type || !page || !sessionId || !ALLOWED_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid event payload' }, { status: 400 })
    }

    await db.siteEvent.create({
      data: {
        type,
        page: String(page).slice(0, 64),
        sessionId: String(sessionId).slice(0, 128),
        userId: userId || null,
        country: country ? String(country).slice(0, 8) : null,
        meta: meta ? String(meta).slice(0, 256) : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analytics event error:', error)
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 })
  }
}

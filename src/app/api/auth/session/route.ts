import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('alifaain-session')?.value
    
    if (!token) {
      return NextResponse.json({ user: null })
    }

    const user = verifySessionToken(token)
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json({ user: null })
  }
}

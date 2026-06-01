import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/password'
import { createSessionToken, setSessionCookie } from '@/lib/session'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isValidPassword = verifyPassword(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = createSessionToken({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      adminRole: user.adminRole,
      permissions: user.permissions,
      createdAt: user.createdAt.toISOString(),
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        adminRole: user.adminRole,
        permissions: user.permissions,
        createdAt: user.createdAt.toISOString(),
      },
    })

    response.cookies.set(setSessionCookie(token))
    return response
  } catch (error) {
    console.error('Sign in error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

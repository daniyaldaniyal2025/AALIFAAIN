import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/password'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Check if user already exists
    let existingUser
    try {
      existingUser = await db.user.findUnique({
        where: { email },
      })
    } catch (dbError) {
      console.error('DB find error:', dbError)
      return NextResponse.json(
        { error: 'Database error. Please try again.' },
        { status: 500 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = hashPassword(password)

    // Create user
    try {
      const user = await db.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'customer',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      return NextResponse.json(
        { message: 'Account created successfully', user },
        { status: 201 }
      )
    } catch (createError) {
      console.error('DB create error:', createError)
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}

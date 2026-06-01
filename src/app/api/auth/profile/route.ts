import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/session'
import { hashPassword } from '@/lib/password'
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

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        _count: {
          select: { orders: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Profile error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('alifaain-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const sessionUser = verifySessionToken(token)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, currentPassword, newPassword } = body

    const user = await db.user.findUnique({ where: { id: sessionUser.id } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If changing password, verify current password
    if (currentPassword && newPassword) {
      const { verifyPassword } = await import('@/lib/password')
      if (!verifyPassword(currentPassword, user.password)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }
      const hashedPassword = hashPassword(newPassword)
      await db.user.update({
        where: { id: sessionUser.id },
        data: { password: hashedPassword },
      })
    }

    // Update profile fields
    const updateData: { name?: string; email?: string } = {}
    if (name && name !== user.name) {
      updateData.name = name
    }
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await db.user.findUnique({ where: { email } })
      if (existingUser && existingUser.id !== sessionUser.id) {
        return NextResponse.json({ error: 'Email is already taken' }, { status: 409 })
      }
      updateData.email = email
    }

    if (Object.keys(updateData).length > 0) {
      await db.user.update({
        where: { id: sessionUser.id },
        data: updateData,
      })
    }

    // Get updated user
    const updatedUser = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, name: true, email: true, image: true, role: true },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

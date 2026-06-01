import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { verifySessionToken } from '@/lib/session'

const FULL_PERMISSIONS = JSON.stringify({
  products: { view: true, add: true, edit: true, delete: true },
  categories: { view: true, add: true, edit: true, delete: true },
  orders: { view: true, edit: true, delete: true },
  staff: { view: true, add: true, edit: true, delete: true },
})

const DEFAULT_PERMISSIONS = JSON.stringify({
  products: { view: true, add: false, edit: false, delete: false },
  categories: { view: true, add: false, edit: false, delete: false },
  orders: { view: true, edit: false, delete: false },
  staff: { view: false, add: false, edit: false, delete: false },
})

async function checkSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('alifaain-session')?.value
  if (!token) return null
  const user = verifySessionToken(token)
  if (!user || user.role !== 'admin' || user.adminRole !== 'super_admin') return null
  return user
}

// GET all admin/staff users
export async function GET(request: NextRequest) {
  try {
    const currentUser = await checkSuperAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized — super admin access required' }, { status: 403 })
    }

    const staff = await db.user.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        adminRole: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Failed to fetch staff:', error)
    return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 })
  }
}

// POST — create a new staff/admin user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await checkSuperAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized — super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, adminRole, permissions } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const hashedPassword = hashPassword(password)
    const role = adminRole === 'super_admin' ? 'admin' : 'admin'
    const finalPermissions = adminRole === 'super_admin' ? FULL_PERMISSIONS : (permissions || DEFAULT_PERMISSIONS)

    const staff = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        adminRole: adminRole || 'sub_admin',
        permissions: typeof finalPermissions === 'string' ? finalPermissions : JSON.stringify(finalPermissions),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        adminRole: true,
        permissions: true,
        createdAt: true,
      },
    })

    return NextResponse.json(staff, { status: 201 })
  } catch (error) {
    console.error('Failed to create staff:', error)
    return NextResponse.json({ error: 'Failed to create staff member' }, { status: 500 })
  }
}

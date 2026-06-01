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

async function checkSuperAdmin(request: NextRequest) {
  const token = request.cookies.get('alifaain-session')?.value
  if (!token) return null
  const user = verifySessionToken(token)
  if (!user || user.role !== 'admin' || user.adminRole !== 'super_admin') return null
  return user
}

// GET single staff member
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await checkSuperAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const staff = await db.user.findUnique({
      where: { id },
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

    if (!staff || staff.role !== 'admin') {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json(staff)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch staff member' }, { status: 500 })
  }
}

// PUT — update staff member permissions/role
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await checkSuperAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized — super admin access required' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, password, adminRole, permissions } = body

    // Cannot modify yourself
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'You cannot modify your own account' }, { status: 400 })
    }

    const existingStaff = await db.user.findUnique({ where: { id } })
    if (!existingStaff || existingStaff.role !== 'admin') {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check email uniqueness if changing email
    if (email && email !== existingStaff.email) {
      const emailConflict = await db.user.findUnique({ where: { email } })
      if (emailConflict) {
        return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (adminRole !== undefined) {
      updateData.adminRole = adminRole
      if (adminRole === 'super_admin') {
        updateData.permissions = FULL_PERMISSIONS
      }
    }
    if (permissions !== undefined && adminRole !== 'super_admin') {
      updateData.permissions = typeof permissions === 'string' ? permissions : JSON.stringify(permissions)
    }
    if (password && password.length >= 6) {
      updateData.password = hashPassword(password)
    }

    const staff = await db.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Failed to update staff:', error)
    return NextResponse.json({ error: 'Failed to update staff member' }, { status: 500 })
  }
}

// DELETE — remove admin access from a user
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await checkSuperAdmin(request)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized — super admin access required' }, { status: 403 })
    }

    const { id } = await params

    // Cannot delete yourself
    if (id === currentUser.id) {
      return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 })
    }

    const existingStaff = await db.user.findUnique({ where: { id } })
    if (!existingStaff || existingStaff.role !== 'admin') {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Downgrade to customer instead of deleting
    await db.user.update({
      where: { id },
      data: {
        role: 'customer',
        adminRole: 'sub_admin',
        permissions: '{}',
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete staff:', error)
    return NextResponse.json({ error: 'Failed to remove staff member' }, { status: 500 })
  }
}

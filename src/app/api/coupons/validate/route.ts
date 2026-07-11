import { NextRequest, NextResponse } from 'next/server'
import { validateCouponCode } from '@/lib/coupons'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, subtotal } = body

    if (!code || subtotal == null) {
      return NextResponse.json(
        { error: 'Coupon code and subtotal are required' },
        { status: 400 }
      )
    }

    const result = await validateCouponCode(code, Number(subtotal))
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ coupon: result.coupon })
  } catch (error) {
    console.error('Coupon validate error:', error)
    return NextResponse.json({ error: 'Failed to validate coupon' }, { status: 500 })
  }
}

import { db } from '@/lib/db'

export interface ValidatedCoupon {
  code: string
  discountAmount: number
  discountType: 'percent' | 'fixed'
  discountValue: number
  description: string | null
}

export async function validateCouponCode(
  code: string,
  subtotal: number
): Promise<{ coupon: ValidatedCoupon } | { error: string }> {
  const normalizedCode = code.trim().toUpperCase()
  if (!normalizedCode) {
    return { error: 'Please enter a coupon code' }
  }

  const coupon = await db.coupon.findUnique({ where: { code: normalizedCode } })
  if (!coupon) {
    return { error: 'Invalid coupon code' }
  }
  if (!coupon.active) {
    return { error: 'This coupon is no longer active' }
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { error: 'This coupon has expired' }
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { error: 'This coupon has reached its usage limit' }
  }
  if (subtotal < coupon.minOrderTotal) {
    return {
      error: `Minimum order of SAR ${coupon.minOrderTotal.toFixed(0)} required for this coupon`,
    }
  }

  let discountAmount =
    coupon.discountType === 'percent'
      ? Math.round(subtotal * coupon.discountValue) / 100
      : coupon.discountValue

  discountAmount = Math.min(Math.max(0, discountAmount), subtotal)

  return {
    coupon: {
      code: coupon.code,
      discountAmount,
      discountType: coupon.discountType as 'percent' | 'fixed',
      discountValue: coupon.discountValue,
      description: coupon.description,
    },
  }
}

export async function applyCouponUsage(code: string) {
  await db.coupon.update({
    where: { code: code.toUpperCase() },
    data: { usedCount: { increment: 1 } },
  })
}

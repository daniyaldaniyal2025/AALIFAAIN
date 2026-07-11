import { db } from '@/lib/db'

const DEFAULT_COUPONS = [
  {
    code: 'WELCOME10',
    description: '10% off your order',
    discountType: 'percent',
    discountValue: 10,
    minOrderTotal: 0,
    maxUses: null,
  },
  {
    code: 'SAVE25',
    description: 'SAR 25 off orders over SAR 100',
    discountType: 'fixed',
    discountValue: 25,
    minOrderTotal: 100,
    maxUses: null,
  },
  {
    code: 'ALIFAAIN15',
    description: '15% off orders over SAR 150',
    discountType: 'percent',
    discountValue: 15,
    minOrderTotal: 150,
    maxUses: 100,
  },
]

export async function seedCoupons() {
  for (const coupon of DEFAULT_COUPONS) {
    const exists = await db.coupon.findUnique({ where: { code: coupon.code } })
    if (!exists) {
      await db.coupon.create({ data: coupon })
    }
  }
  return db.coupon.count()
}

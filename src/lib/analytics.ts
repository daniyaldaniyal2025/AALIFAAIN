const SESSION_KEY = 'alifaain-analytics-session'

export type AnalyticsEventType =
  | 'page_view'
  | 'sign_in'
  | 'sign_up'
  | 'add_to_cart'
  | 'checkout'

export function getAnalyticsSessionId(): string {
  if (typeof window === 'undefined') return 'server'

  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function trackEvent(
  type: AnalyticsEventType,
  page: string,
  options?: { userId?: string; country?: string; meta?: string }
) {
  if (typeof window === 'undefined') return

  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      page,
      sessionId: getAnalyticsSessionId(),
      userId: options?.userId,
      country: options?.country,
      meta: options?.meta,
    }),
  }).catch(() => {})
}

export const PAGE_LABELS: Record<string, string> = {
  home: 'Home',
  products: 'Shop',
  'product-detail': 'Product Detail',
  about: 'About',
  contact: 'Contact',
  cart: 'Cart',
  wishlist: 'Wishlist',
  checkout: 'Checkout',
  signin: 'Sign In',
  signup: 'Sign Up',
  profile: 'Profile',
  admin: 'Admin',
  'admin-products': 'Admin Products',
  'admin-orders': 'Admin Orders',
  'admin-categories': 'Admin Categories',
  'admin-staff': 'Admin Staff',
}

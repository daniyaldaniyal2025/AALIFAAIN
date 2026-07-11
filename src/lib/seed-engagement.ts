import { db } from '@/lib/db'

const PAGES = ['home', 'products', 'product-detail', 'about', 'contact', 'cart', 'checkout', 'signin', 'signup']

function randomSession(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export async function seedEngagementEvents() {
  const existing = await db.siteEvent.count()
  if (existing > 0) return existing

  const events: {
    type: string
    page: string
    sessionId: string
    country: string
    createdAt: Date
  }[] = []

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const date = new Date()
    date.setDate(date.getDate() - dayOffset)
    date.setHours(12, 0, 0, 0)

    const sessionsForDay = 8 + Math.floor(Math.random() * 12)

    for (let s = 0; s < sessionsForDay; s++) {
      const sessionId = randomSession(`demo_${dayOffset}`)
      const views = 1 + Math.floor(Math.random() * 4)

      for (let v = 0; v < views; v++) {
        const eventDate = new Date(date)
        eventDate.setHours(eventDate.getHours() + v * 2)

        events.push({
          type: 'page_view',
          page: PAGES[Math.floor(Math.random() * PAGES.length)],
          sessionId,
          country: Math.random() > 0.3 ? 'SA' : 'AE',
          createdAt: eventDate,
        })
      }

      if (Math.random() > 0.55) {
        events.push({
          type: 'add_to_cart',
          page: 'products',
          sessionId,
          country: 'SA',
          createdAt: new Date(date.getTime() + 3 * 60 * 60 * 1000),
        })
      }

      if (Math.random() > 0.75) {
        events.push({
          type: 'checkout',
          page: 'checkout',
          sessionId,
          country: 'SA',
          createdAt: new Date(date.getTime() + 4 * 60 * 60 * 1000),
        })
      }

      if (Math.random() > 0.85) {
        events.push({
          type: 'sign_in',
          page: 'signin',
          sessionId,
          country: 'SA',
          createdAt: new Date(date.getTime() + 1 * 60 * 60 * 1000),
        })
      }
    }
  }

  await db.siteEvent.createMany({ data: events })
  return events.length
}

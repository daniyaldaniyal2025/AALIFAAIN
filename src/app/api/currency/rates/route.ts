import { NextResponse } from 'next/server'
import { countries } from '@/lib/currency'

const RATES_API = 'https://open.er-api.com/v6/latest/SAR'
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

let cache: { rates: Record<string, number>; fetchedAt: number } | null = null

const SUPPORTED_CURRENCIES = [...new Set(countries.map((c) => c.currency))]

function buildFallbackRates(): Record<string, number> {
  const rates: Record<string, number> = { SAR: 1 }
  for (const country of countries) {
    rates[country.currency] = country.rate
  }
  return rates
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
      return NextResponse.json({
        rates: cache.rates,
        base: 'SAR',
        updatedAt: cache.fetchedAt,
        cached: true,
        live: true,
      })
    }

    const res = await fetch(RATES_API, { next: { revalidate: 900 } })

    if (!res.ok) {
      throw new Error(`Rates API returned ${res.status}`)
    }

    const data = await res.json()

    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid rates API response')
    }

    const rates: Record<string, number> = { SAR: 1 }
    for (const currency of SUPPORTED_CURRENCIES) {
      if (data.rates[currency] !== undefined) {
        rates[currency] = data.rates[currency]
      }
    }

    // Fill any missing currencies from static fallback
    const fallback = buildFallbackRates()
    for (const currency of SUPPORTED_CURRENCIES) {
      if (rates[currency] === undefined && fallback[currency] !== undefined) {
        rates[currency] = fallback[currency]
      }
    }

    cache = { rates, fetchedAt: Date.now() }

    return NextResponse.json({
      rates,
      base: 'SAR',
      updatedAt: cache.fetchedAt,
      cached: false,
      live: true,
    })
  } catch (error) {
    console.error('Currency rates fetch error:', error)

    const fallback = cache?.rates ?? buildFallbackRates()

    return NextResponse.json({
      rates: fallback,
      base: 'SAR',
      updatedAt: cache?.fetchedAt ?? Date.now(),
      cached: Boolean(cache),
      live: false,
      error: 'Using fallback rates',
    })
  }
}

// Country to currency mapping and exchange rates (base: SAR)
export interface CountryInfo {
  code: string
  name: string
  currency: string
  currencySymbol: string
  flag: string
  rate: number // Static fallback rate from SAR to this currency
}

export const countries: CountryInfo[] = [
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: '﷼', flag: '🇸🇦', rate: 1 },
  { code: 'AE', name: 'UAE', currency: 'AED', currencySymbol: 'د.إ', flag: '🇦🇪', rate: 0.98 },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', currencySymbol: 'د.ك', flag: '🇰🇼', rate: 0.082 },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', currencySymbol: 'د.ب', flag: '🇧🇭', rate: 0.10 },
  { code: 'QA', name: 'Qatar', currency: 'QAR', currencySymbol: '﷼', flag: '🇶🇦', rate: 0.97 },
  { code: 'OM', name: 'Oman', currency: 'OMR', currencySymbol: '﷼', flag: '🇴🇲', rate: 0.10 },
  { code: 'EG', name: 'Egypt', currency: 'EGP', currencySymbol: '£', flag: '🇪🇬', rate: 13.32 },
  { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', flag: '🇺🇸', rate: 0.27 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£', flag: '🇬🇧', rate: 0.21 },
  { code: 'EU', name: 'Europe', currency: 'EUR', currencySymbol: '€', flag: '🇪🇺', rate: 0.25 },
  { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', flag: '🇮🇳', rate: 22.62 },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: '₨', flag: '🇵🇰', rate: 75.40 },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', currencySymbol: '৳', flag: '🇧🇩', rate: 32.30 },
  { code: 'PH', name: 'Philippines', currency: 'PHP', currencySymbol: '₱', flag: '🇵🇭', rate: 15.63 },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', currencySymbol: 'RM', flag: '🇲🇾', rate: 1.19 },
  { code: 'TR', name: 'Turkey', currency: 'TRY', currencySymbol: '₺', flag: '🇹🇷', rate: 9.79 },
  { code: 'JO', name: 'Jordan', currency: 'JOD', currencySymbol: 'د.ا', flag: '🇯🇴', rate: 0.19 },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', currencySymbol: 'ل.ل', flag: '🇱🇧', rate: 24158.02 },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', currencySymbol: 'ع.د', flag: '🇮🇶', rate: 352.50 },
  { code: 'MA', name: 'Morocco', currency: 'MAD', currencySymbol: 'د.م.', flag: '🇲🇦', rate: 2.70 },
  { code: 'KR', name: 'South Korea', currency: 'KRW', currencySymbol: '₩', flag: '🇰🇷', rate: 369.50 },
]

let liveRates: Record<string, number> | null = null
let ratesUpdatedAt: number | null = null
let ratesAreLive = false

export function setExchangeRates(rates: Record<string, number>, live = true) {
  liveRates = rates
  ratesUpdatedAt = Date.now()
  ratesAreLive = live
}

export function getRatesUpdatedAt(): number | null {
  return ratesUpdatedAt
}

export function areRatesLive(): boolean {
  return ratesAreLive
}

function getRateForCountry(countryCode: string): number {
  const country = countries.find((c) => c.code === countryCode) || countries[0]
  if (country.currency === 'SAR') return 1
  if (liveRates?.[country.currency] !== undefined) {
    return liveRates[country.currency]
  }
  return country.rate
}

export function convertPrice(priceInSAR: number, countryCode: string): number {
  return priceInSAR * getRateForCountry(countryCode)
}

export function formatPrice(priceInSAR: number, countryCode: string): string {
  const country = countries.find((c) => c.code === countryCode) || countries[0]
  const converted = priceInSAR * getRateForCountry(countryCode)

  if (country.currency === 'KRW' || country.currency === 'LBP' || country.currency === 'IQD') {
    return `${country.currencySymbol} ${Math.round(converted).toLocaleString()}`
  }

  return `${country.currencySymbol} ${converted.toFixed(2)}`
}

export function getCountryByCode(code: string): CountryInfo {
  const country = countries.find((c) => c.code === code) || countries[0]
  return {
    ...country,
    rate: getRateForCountry(code),
  }
}

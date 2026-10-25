// Country to currency mapping and exchange rates (base: SAR).
// `rate` is how many units of that currency equal 1 Saudi riyal.
// Fallback snapshot: ExchangeRate-API (open.er-api.com), base SAR, 16 Oct 2026.
// Pegged references (live API uses the same base):
//   1 USD = 3.75 SAR  →  1 SAR = 0.2667 USD
//   1 USD = 3.6725 AED → 1 SAR = 0.9793 AED
//   1 USD = 0.376 BHD  → 1 SAR = 0.1003 BHD
//   1 USD = 3.64 QAR   → 1 SAR = 0.9707 QAR
//   1 USD = 0.3845 OMR → 1 SAR = 0.1025 OMR
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
  { code: 'AE', name: 'UAE', currency: 'AED', currencySymbol: 'د.إ', flag: '🇦🇪', rate: 0.9793 },
  { code: 'KW', name: 'Kuwait', currency: 'KWD', currencySymbol: 'د.ك', flag: '🇰🇼', rate: 0.0828 },
  { code: 'BH', name: 'Bahrain', currency: 'BHD', currencySymbol: 'د.ب', flag: '🇧🇭', rate: 0.1003 },
  { code: 'QA', name: 'Qatar', currency: 'QAR', currencySymbol: '﷼', flag: '🇶🇦', rate: 0.9707 },
  { code: 'OM', name: 'Oman', currency: 'OMR', currencySymbol: '﷼', flag: '🇴🇲', rate: 0.1025 },
  { code: 'EG', name: 'Egypt', currency: 'EGP', currencySymbol: '£', flag: '🇪🇬', rate: 14.26 },
  { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$', flag: '🇺🇸', rate: 0.2667 },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£', flag: '🇬🇧', rate: 0.2011 },
  { code: 'EU', name: 'Europe', currency: 'EUR', currencySymbol: '€', flag: '🇪🇺', rate: 0.2378 },
  { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹', flag: '🇮🇳', rate: 25.36 },
  { code: 'PK', name: 'Pakistan', currency: 'PKR', currencySymbol: '₨', flag: '🇵🇰', rate: 73.86 },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', currencySymbol: '৳', flag: '🇧🇩', rate: 32.83 },
  { code: 'PH', name: 'Philippines', currency: 'PHP', currencySymbol: '₱', flag: '🇵🇭', rate: 16.82 },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', currencySymbol: 'RM', flag: '🇲🇾', rate: 1.0887 },
  { code: 'TR', name: 'Turkey', currency: 'TRY', currencySymbol: '₺', flag: '🇹🇷', rate: 13.2 },
  { code: 'JO', name: 'Jordan', currency: 'JOD', currencySymbol: 'د.ا', flag: '🇯🇴', rate: 0.1891 },
  { code: 'LB', name: 'Lebanon', currency: 'LBP', currencySymbol: 'ل.ل', flag: '🇱🇧', rate: 23866.67 },
  { code: 'IQ', name: 'Iraq', currency: 'IQD', currencySymbol: 'ع.د', flag: '🇮🇶', rate: 404.68 },
  { code: 'MA', name: 'Morocco', currency: 'MAD', currencySymbol: 'د.م.', flag: '🇲🇦', rate: 2.6175 },
  { code: 'KR', name: 'South Korea', currency: 'KRW', currencySymbol: '₩', flag: '🇰🇷', rate: 358.05 },
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

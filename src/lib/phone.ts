export interface PhoneCountry {
  code: string
  name: string
  dialCode: string
  flag: string
}

export const phoneCountries: PhoneCountry[] = [
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧' },
  { code: 'IQ', name: 'Iraq', dialCode: '+964', flag: '🇮🇶' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
]

const sortedByDialCode = [...phoneCountries].sort(
  (a, b) => b.dialCode.length - a.dialCode.length
)

export function getPhoneCountry(code: string): PhoneCountry {
  return phoneCountries.find((c) => c.code === code) ?? phoneCountries[0]
}

export function parsePhoneValue(value: string, defaultCountryCode = 'SA') {
  const fallback = getPhoneCountry(defaultCountryCode)

  if (!value.trim()) {
    return { countryCode: fallback.code, localNumber: '' }
  }

  const trimmed = value.trim()

  for (const country of sortedByDialCode) {
    if (trimmed.startsWith(country.dialCode)) {
      return {
        countryCode: country.code,
        localNumber: trimmed.slice(country.dialCode.length).trim(),
      }
    }
    const withoutPlus = country.dialCode.slice(1)
    if (trimmed.startsWith(withoutPlus)) {
      return {
        countryCode: country.code,
        localNumber: trimmed.slice(withoutPlus.length).trim(),
      }
    }
  }

  if (trimmed.startsWith('+')) {
    return { countryCode: fallback.code, localNumber: trimmed }
  }

  return { countryCode: fallback.code, localNumber: trimmed }
}

export function buildPhoneValue(countryCode: string, localNumber: string): string {
  const country = getPhoneCountry(countryCode)
  const digits = localNumber.replace(/\D/g, '')
  if (!digits) return ''
  return `${country.dialCode}${digits}`
}

/** Normalize phone to digits and optional leading + for consistent storage/lookup */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  const digits = normalized.replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15
}

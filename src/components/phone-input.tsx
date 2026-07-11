'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  buildPhoneValue,
  getPhoneCountry,
  parsePhoneValue,
  phoneCountries,
} from '@/lib/phone'

interface PhoneInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  defaultCountryCode?: string
  placeholder?: string
  className?: string
  inputClassName?: string
  error?: boolean
  autoComplete?: string
}

export function PhoneInput({
  id,
  value,
  onChange,
  defaultCountryCode = 'SA',
  placeholder = '5X XXX XXXX',
  className,
  inputClassName,
  error,
  autoComplete = 'tel',
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState(() =>
    parsePhoneValue(value, defaultCountryCode).countryCode
  )
  const [localNumber, setLocalNumber] = useState(() =>
    parsePhoneValue(value, defaultCountryCode).localNumber
  )

  // Sync when parent value changes externally (e.g. form reset or prefill)
  useEffect(() => {
    if (!value.trim()) {
      setLocalNumber('')
      return
    }
    const parsed = parsePhoneValue(value, defaultCountryCode)
    setCountryCode(parsed.countryCode)
    setLocalNumber(parsed.localNumber)
  }, [value, defaultCountryCode])

  const selectedCountry = getPhoneCountry(countryCode)

  const handleCountryChange = (nextCountryCode: string) => {
    setCountryCode(nextCountryCode)
    onChange(buildPhoneValue(nextCountryCode, localNumber))
  }

  const handleNumberChange = (nextLocalNumber: string) => {
    setLocalNumber(nextLocalNumber)
    onChange(buildPhoneValue(countryCode, nextLocalNumber))
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Select value={countryCode} onValueChange={handleCountryChange}>
        <SelectTrigger
          className={cn(
            'w-[7.5rem] shrink-0 px-2',
            error && 'border-destructive focus-visible:ring-destructive/20'
          )}
          aria-label="Country code"
        >
          <span className="flex items-center gap-1.5">
            <span>{selectedCountry.flag}</span>
            <span className="text-xs font-medium">{selectedCountry.dialCode}</span>
          </span>
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {phoneCountries.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span className="font-medium">{country.dialCode}</span>
                <span className="text-muted-foreground">{country.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        placeholder={placeholder}
        value={localNumber}
        onChange={(e) => handleNumberChange(e.target.value)}
        className={cn('flex-1 min-w-0', error && 'border-destructive focus-visible:ring-destructive/20', inputClassName)}
        autoComplete={autoComplete}
        aria-invalid={error}
      />
    </div>
  )
}

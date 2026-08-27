import { useMemo, useState } from 'react'
import type { ComponentPropsWithoutRef, ElementType } from 'react'
import PhoneNumberInput from 'react-phone-number-input'
import {
  getCountryCallingCode,
  type Country,
} from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import metadata from 'libphonenumber-js/metadata.min.json'

import { DEFAULT_PHONE_COUNTRY } from '@/utils/phone.ts'

type PhoneInputProps = {
  id?: string
  name?: string
  value?: string
  onChange: (value: string | undefined) => void
  onBlur?: () => void
  disabled?: boolean
  placeholder?: string
  autoComplete?: string
  ariaInvalid?: boolean
  ariaDescribedBy?: string
  variant?: 'auth' | 'profile'
}

type CountryOption = {
  value?: string
  label: string
  divider?: boolean
}

type CountrySelectProps = {
  value?: Country
  onChange: (value?: Country) => void
  options: CountryOption[]
  disabled?: boolean
  readOnly?: boolean
  iconComponent: ElementType<{
    country: Country
    label: string
    aspectRatio?: number
  }>
  className?: string
}

function getLeadingDigitsSeed(leadingPatterns: unknown[], targetLength: number) {
  const leadingDigits = leadingPatterns
    .map((pattern) => String(pattern).match(/\d+/)?.[0] ?? '')
    .find(Boolean)

  if (!leadingDigits) {
    return ''
  }

  if (leadingDigits.length >= targetLength) {
    return leadingDigits.slice(0, targetLength)
  }

  if (leadingDigits.length === 1) {
    return leadingDigits.repeat(targetLength)
  }

  return `${leadingDigits}${'1234567890'}`.slice(0, targetLength)
}

function resolvePlaceholderForCountry(country: Country, fallback: string) {
  const countryMetadata = metadata.countries[country]

  if (!countryMetadata) {
    return fallback
  }

  const formats = Array.isArray(countryMetadata[4]) ? countryMetadata[4] : []
  const nationalPrefix = typeof countryMetadata[5] === 'string' ? countryMetadata[5] : ''

  const preferredFormat = [...formats].sort((left, right) => {
    const leftReplacement = String(left[1] ?? '')
    const rightReplacement = String(right[1] ?? '')
    const leftLeadingPatterns = Array.isArray(left[2]) ? left[2] : []
    const rightLeadingPatterns = Array.isArray(right[2]) ? right[2] : []
    const leftScore =
      (leftReplacement.includes('15-') ? -10 : 0) +
      (leftLeadingPatterns.some((pattern) => String(pattern) === '9') ? 4 : 0) +
      (leftLeadingPatterns.some((pattern) => String(pattern) === '1') ? 3 : 0) +
      (leftLeadingPatterns.some((pattern) => String(pattern).includes('[2-9]')) ? 2 : 0) -
      (leftReplacement.match(/\$\d+/g)?.length ?? 0)
    const rightScore =
      (rightReplacement.includes('15-') ? -10 : 0) +
      (rightLeadingPatterns.some((pattern) => String(pattern) === '9') ? 4 : 0) +
      (rightLeadingPatterns.some((pattern) => String(pattern) === '1') ? 3 : 0) +
      (rightLeadingPatterns.some((pattern) => String(pattern).includes('[2-9]')) ? 2 : 0) -
      (rightReplacement.match(/\$\d+/g)?.length ?? 0)

    return rightScore - leftScore
  })[0]

  if (!preferredFormat) {
    return fallback
  }

  const formatPattern = String(preferredFormat[0])
  const replacementPattern = String(preferredFormat[1])
  const leadingPatterns = Array.isArray(preferredFormat[2]) ? preferredFormat[2] : []
  const nationalPrefixRule =
    typeof preferredFormat[3] === 'string' ? preferredFormat[3] : ''
  const digitGroups = [...formatPattern.matchAll(/\\d\{(\d+)(?:,\d+)?\}|\\d/g)].map(
    (match) => {
      if (match[1]) {
        return Number(match[1])
      }

      return 1
    },
  )

  if (digitGroups.length === 0) {
    return fallback
  }

  const totalDigits = digitGroups.reduce((sum, size) => sum + size, 0)
  const seedDigits = '1234567890'
  const firstGroupSize = digitGroups[0] ?? 0
  const firstGroupSeed = getLeadingDigitsSeed(leadingPatterns, firstGroupSize)
  let digits = firstGroupSeed || '2'

  while (digits.length < totalDigits) {
    digits += seedDigits
  }

  let offset = 0
  const groups = digitGroups.map((size) => {
    const slice = digits.slice(offset, offset + size)
    offset += size
    return slice
  })

  if (
    nationalPrefix &&
    nationalPrefixRule &&
    nationalPrefixRule.includes('$1') &&
    groups[0]
  ) {
    groups[0] = nationalPrefixRule
      .replace('$NP', nationalPrefix)
      .replace('$FG', groups[0])
      .replace('$1', groups[0])
  }

  return replacementPattern
    .replace(/\$(\d+)/g, (_, index) => groups[Number(index) - 1] ?? '')
    .trim()
}

function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  iconComponent: Icon,
  className,
  ...rest
}: CountrySelectProps & Omit<ComponentPropsWithoutRef<'select'>, 'value' | 'onChange'>) {
  const selectedCountry = value ?? DEFAULT_PHONE_COUNTRY
  const selectedOption = options.find(
    (option) => !option.divider && option.value === selectedCountry,
  )
  const callingCode = `+${getCountryCallingCode(selectedCountry)}`
  const wrapperClassName = className
    ? `app-phone-input__country ${className}`
    : 'app-phone-input__country'

  return (
    <div className={wrapperClassName}>
      <select
        {...rest}
        disabled={disabled || readOnly}
        value={value ?? selectedCountry}
        onChange={(event) => {
          const nextValue = event.target.value
          onChange(nextValue ? (nextValue as Country) : undefined)
        }}
        className="app-phone-input__country-select"
      >
        {options.map((option) => (
          <option
            key={option.divider ? `divider-${option.label}` : option.value ?? 'ZZ'}
            value={option.divider ? '|' : option.value ?? 'ZZ'}
            disabled={option.divider}
          >
            {option.label}
          </option>
        ))}
      </select>

      <div className="app-phone-input__country-display" aria-hidden="true">
        <Icon
          country={selectedCountry}
          label={selectedOption?.label ?? selectedCountry}
          aspectRatio={undefined}
        />
        <span className="app-phone-input__country-calling-code">{callingCode}</span>
        <span className="app-phone-input__country-arrow" />
      </div>
    </div>
  )
}

export function PhoneInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled = false,
  placeholder = '099 123 456',
  autoComplete = 'tel',
  ariaInvalid = false,
  ariaDescribedBy,
  variant = 'auth',
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    DEFAULT_PHONE_COUNTRY as Country,
  )
  const rootClassName =
    variant === 'profile'
      ? 'app-phone-input app-phone-input--profile'
      : 'app-phone-input app-phone-input--auth'
  const resolvedPlaceholder = useMemo(
    () => resolvePlaceholderForCountry(selectedCountry, placeholder),
    [placeholder, selectedCountry],
  )

  return (
    <PhoneNumberInput
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={resolvedPlaceholder}
      autoComplete={autoComplete}
      defaultCountry={DEFAULT_PHONE_COUNTRY as Country}
      onCountryChange={(country) => {
        setSelectedCountry(country ?? (DEFAULT_PHONE_COUNTRY as Country))
      }}
      international={false}
      countryCallingCodeEditable={false}
      smartCaret={false}
      className={rootClassName}
      countrySelectComponent={PhoneCountrySelect}
      countrySelectProps={{
        'aria-label': 'Seleccionar país',
      }}
      numberInputProps={{
        'aria-invalid': ariaInvalid || undefined,
        'aria-describedby': ariaDescribedBy,
      }}
    />
  )
}

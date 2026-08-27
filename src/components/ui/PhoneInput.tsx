import type { ComponentPropsWithoutRef, ElementType } from 'react'
import PhoneNumberInput from 'react-phone-number-input'
import {
  getCountryCallingCode,
  type Country,
} from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

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
  const rootClassName =
    variant === 'profile'
      ? 'app-phone-input app-phone-input--profile'
      : 'app-phone-input app-phone-input--auth'

  return (
    <PhoneNumberInput
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      defaultCountry={DEFAULT_PHONE_COUNTRY as Country}
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

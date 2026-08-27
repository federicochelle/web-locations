import PhoneNumberInput from 'react-phone-number-input'
import type { Country } from 'react-phone-number-input'
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

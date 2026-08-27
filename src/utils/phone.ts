import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

export const DEFAULT_PHONE_COUNTRY = 'UY'

const INVALID_PHONE_MESSAGE = 'Ingresá un teléfono válido.'

function normalizePhoneInput(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? ''

  if (!trimmedValue) {
    return null
  }

  const parsedPhoneNumber = trimmedValue.startsWith('+')
    ? parsePhoneNumberFromString(trimmedValue)
    : parsePhoneNumberFromString(trimmedValue, DEFAULT_PHONE_COUNTRY)

  return parsedPhoneNumber ?? null
}

export function getPhoneError(value: string | null | undefined) {
  const parsedPhoneNumber = normalizePhoneInput(value)

  if (!parsedPhoneNumber) {
    return value?.trim() ? INVALID_PHONE_MESSAGE : null
  }

  if (!parsedPhoneNumber.isPossible() || !parsedPhoneNumber.isValid()) {
    return INVALID_PHONE_MESSAGE
  }

  return null
}

export function normalizePhoneForStorage(value: string | null | undefined) {
  const parsedPhoneNumber = normalizePhoneInput(value)

  if (!parsedPhoneNumber) {
    return null
  }

  if (!parsedPhoneNumber.isPossible() || !parsedPhoneNumber.isValid()) {
    return null
  }

  return parsedPhoneNumber.number
}

export function normalizePhoneForInput(value: string | null | undefined) {
  const parsedPhoneNumber = normalizePhoneInput(value)

  if (!parsedPhoneNumber) {
    return undefined
  }

  return parsedPhoneNumber.number
}

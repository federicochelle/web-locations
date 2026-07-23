export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getMinPasswordError(password: string, minLength: number) {
  if (!password) {
    return 'Ingresá una contraseña.'
  }

  if (password.length < minLength) {
    return `La contraseña debe tener al menos ${minLength} caracteres.`
  }

  return null
}

export function getPasswordConfirmationError(
  password: string,
  confirmPassword: string,
) {
  if (!confirmPassword) {
    return 'Confirmá tu contraseña.'
  }

  if (password !== confirmPassword) {
    return 'Las contraseñas no coinciden.'
  }

  return null
}

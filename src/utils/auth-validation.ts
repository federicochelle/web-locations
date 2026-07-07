export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function getMinPasswordError(password: string, minLength: number) {
  if (!password) {
    return 'Ingresa una contrasena.'
  }

  if (password.length < minLength) {
    return `La contrasena debe tener al menos ${minLength} caracteres.`
  }

  return null
}

export function getPasswordConfirmationError(
  password: string,
  confirmPassword: string,
) {
  if (!confirmPassword) {
    return 'Confirma tu contrasena.'
  }

  if (password !== confirmPassword) {
    return 'Las contrasenas no coinciden.'
  }

  return null
}

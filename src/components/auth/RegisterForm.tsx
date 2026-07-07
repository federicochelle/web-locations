import { useState } from 'react'
import { Link } from 'react-router-dom'

import {
  AUTH_MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  signUp,
} from '@/services/auth.service.ts'
import {
  getMinPasswordError,
  getPasswordConfirmationError,
  isValidEmail,
} from '@/utils/auth-validation.ts'

type RegisterFormValues = {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>

function validateForm(values: RegisterFormValues) {
  const errors: RegisterFormErrors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'Ingresa tu nombre completo.'
  }

  if (!values.email.trim()) {
    errors.email = 'Ingresa tu email.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresa un email valido.'
  }

  const passwordError = getMinPasswordError(
    values.password,
    AUTH_MIN_PASSWORD_LENGTH,
  )

  if (passwordError) {
    errors.password = passwordError
  }

  const confirmPasswordError = getPasswordConfirmationError(
    values.password,
    values.confirmPassword,
  )

  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError
  }

  return errors
}

export function RegisterForm() {
  const [values, setValues] = useState<RegisterFormValues>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange<Field extends keyof RegisterFormValues>(
    field: Field,
    nextValue: RegisterFormValues[Field],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))

    setSubmitError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateForm(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)
      setSuccessMessage(null)

      await signUp({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
      })

      setSuccessMessage(
        'Tu cuenta fue creada. Revisa tu email para confirmar el registro antes de iniciar sesion.',
      )
      setValues({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
      })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {successMessage ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {submitError}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
          Nombre completo
        </span>
        <input
          type="text"
          value={values.fullName}
          onChange={(event) => handleChange('fullName', event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
          placeholder="Tu nombre completo"
          autoComplete="name"
          disabled={isSubmitting}
        />
        {errors.fullName ? (
          <p className="text-sm text-red-900">{errors.fullName}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
          Email
        </span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => handleChange('email', event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
          placeholder="tu@email.com"
          autoComplete="email"
          disabled={isSubmitting}
        />
        {errors.email ? <p className="text-sm text-red-900">{errors.email}</p> : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
          Contrasena
        </span>
        <input
          type="password"
          value={values.password}
          onChange={(event) => handleChange('password', event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
          placeholder={`Minimo ${AUTH_MIN_PASSWORD_LENGTH} caracteres`}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {errors.password ? (
          <p className="text-sm text-red-900">{errors.password}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
          Confirmar contrasena
        </span>
        <input
          type="password"
          value={values.confirmPassword}
          onChange={(event) => handleChange('confirmPassword', event.target.value)}
          className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
          placeholder="Repite tu contrasena"
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-900">{errors.confirmPassword}</p>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      <p className="text-sm text-sand-700">
        Ya tienes cuenta?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-700 transition hover:text-brand-500"
        >
          Inicia sesion
        </Link>
      </p>
    </form>
  )
}

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

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
    errors.email = 'Ingresa un email válido.'
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
  const location = useLocation()
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
        'Tu cuenta fue creada. Revisá tu email para confirmar el registro antes de iniciar sesión.',
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
        <div className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {submitError}
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
          Nombre completo
        </span>
        <input
          type="text"
          value={values.fullName}
          onChange={(event) => handleChange('fullName', event.target.value)}
          className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
          placeholder="Tu nombre completo"
          autoComplete="name"
          disabled={isSubmitting}
        />
        {errors.fullName ? (
          <p className="text-sm text-red-200">{errors.fullName}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
          Email
        </span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => handleChange('email', event.target.value)}
          className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
          placeholder="tu@email.com"
          autoComplete="email"
          disabled={isSubmitting}
        />
        {errors.email ? <p className="text-sm text-red-200">{errors.email}</p> : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
          Contraseña
        </span>
        <input
          type="password"
          value={values.password}
          onChange={(event) => handleChange('password', event.target.value)}
          className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
          placeholder={`Mínimo ${AUTH_MIN_PASSWORD_LENGTH} caracteres`}
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {errors.password ? (
          <p className="text-sm text-red-200">{errors.password}</p>
        ) : null}
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
          Confirmar contraseña
        </span>
        <input
          type="password"
          value={values.confirmPassword}
          onChange={(event) => handleChange('confirmPassword', event.target.value)}
          className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
          placeholder="Repetí tu contraseña"
          autoComplete="new-password"
          disabled={isSubmitting}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-200">{errors.confirmPassword}</p>
        ) : null}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="min-h-13 w-full rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>

      <p className="text-sm text-brand-100/58">
        ¿Ya tenés cuenta?{' '}
        <Link
          to="/login"
          state={location.state}
          className="font-medium text-brand-300 transition hover:text-brand-100"
        >
          Iniciá sesión
        </Link>
      </p>
    </form>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { getAuthErrorMessage, signIn } from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

type LoginFormValues = {
  email: string
  password: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>

function validateForm(values: LoginFormValues) {
  const errors: LoginFormErrors = {}

  if (!values.email.trim()) {
    errors.email = 'Ingresa tu email.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresa un email valido.'
  }

  if (!values.password) {
    errors.password = 'Ingresa tu contrasena.'
  }

  return errors
}

export function LoginForm() {
  const [searchParams] = useSearchParams()
  const { isAuthenticated, loading, profile, role } = useAuth()
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAwaitingAuthResolution, setIsAwaitingAuthResolution] = useState(false)

  const notice = useMemo(() => {
    if (searchParams.get('confirmed') === '1') {
      return 'Tu email fue confirmado. Ya puedes iniciar sesion.'
    }

    if (searchParams.get('reset') === 'success') {
      return 'Tu contrasena fue actualizada. Inicia sesion con la nueva.'
    }

    return null
  }, [searchParams])

  useEffect(() => {
    if (!isAwaitingAuthResolution || loading) {
      return
    }

    if (!isAuthenticated) {
      setIsAwaitingAuthResolution(false)
      setSubmitError('No pudimos iniciar la sesion. Intenta nuevamente.')
      return
    }

    if (!profile || !role) {
      setIsAwaitingAuthResolution(false)
      setSubmitError('La sesion se abrio, pero no pudimos resolver tu perfil.')
      return
    }

    window.location.replace(getDefaultRouteByRole(role))
  }, [isAuthenticated, isAwaitingAuthResolution, loading, profile, role])

  function handleChange<Field extends keyof LoginFormValues>(
    field: Field,
    nextValue: LoginFormValues[Field],
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

      await signIn({
        email: values.email.trim(),
        password: values.password,
      })
      setIsAwaitingAuthResolution(true)
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {notice ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {notice}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {submitError}
        </div>
      ) : null}

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
          placeholder="Ingresa tu contrasena"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
        {errors.password ? (
          <p className="text-sm text-red-900">{errors.password}</p>
        ) : null}
      </label>

      <div className="flex items-center justify-end">
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-brand-700 transition hover:text-brand-500"
        >
          Olvide mi contrasena
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isAwaitingAuthResolution}
        className="min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isAwaitingAuthResolution
          ? 'Ingresando...'
          : 'Iniciar sesion'}
      </button>

      <p className="text-sm text-sand-700">
        Aun no tienes cuenta?{' '}
        <Link
          to="/register"
          className="font-medium text-brand-700 transition hover:text-brand-500"
        >
          Registrate
        </Link>
      </p>
    </form>
  )
}

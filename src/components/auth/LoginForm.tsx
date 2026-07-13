import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import { getAuthErrorMessage, signIn } from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

type LoginFormValues = {
  email: string
  password: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.22 1.26-.96 2.33-2.06 3.04l3.34 2.6c1.94-1.8 3.06-4.44 3.06-7.58 0-.74-.07-1.45-.2-2.13H12Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.78 0 5.12-.92 6.83-2.48l-3.34-2.6c-.92.62-2.1.98-3.49.98-2.68 0-4.95-1.8-5.76-4.22l-3.45 2.66A10.32 10.32 0 0 0 12 22Z"
      />
      <path
        fill="#4A90E2"
        d="M6.24 13.68A6.2 6.2 0 0 1 5.9 12c0-.58.1-1.15.28-1.68L2.73 7.66A10.32 10.32 0 0 0 1.7 12c0 1.65.4 3.21 1.1 4.58l3.44-2.9Z"
      />
      <path
        fill="#FBBC05"
        d="M12 6.1c1.5 0 2.85.52 3.92 1.53l2.94-2.94C17.12 3.06 14.78 2 12 2 7.95 2 4.45 4.3 2.73 7.66l3.45 2.66C7.05 7.9 9.32 6.1 12 6.1Z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M15.1 3.2c0 1-.36 1.94-.95 2.6-.73.8-1.92 1.42-3.03 1.33-.14-.99.35-2.01.93-2.68.68-.78 1.9-1.37 3.05-1.25ZM18.57 17.63c-.5 1.14-.74 1.64-1.38 2.62-.89 1.34-2.15 3-3.7 3.01-1.38.01-1.73-.88-3.6-.87-1.87.01-2.25.89-3.63.88-1.55-.01-2.74-1.5-3.63-2.84-2.5-3.76-2.77-8.18-1.22-10.56 1.1-1.7 2.84-2.7 4.48-2.7 1.68 0 2.74.9 4.14.9 1.36 0 2.19-.9 4.13-.9 1.46 0 3 .8 4.11 2.18-3.62 1.99-3.03 7.17.3 8.28Z" />
    </svg>
  )
}

function validateForm(values: LoginFormValues) {
  const errors: LoginFormErrors = {}

  if (!values.email.trim()) {
    errors.email = 'Ingresa tu email.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresa un email válido.'
  }

  if (!values.password) {
    errors.password = 'Ingresa tu contraseña.'
  }

  return errors
}

export function LoginForm() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
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
      return 'Tu email fue confirmado. Ya puedes iniciar sesión.'
    }

    if (searchParams.get('reset') === 'success') {
      return 'Tu contraseña fue actualizada. Iniciá sesión con la nueva.'
    }

    return null
  }, [searchParams])

  const authNavigationState = location.state
  const returnTo =
    typeof authNavigationState === 'object' &&
    authNavigationState &&
    'from' in authNavigationState &&
    authNavigationState.from &&
    typeof authNavigationState.from === 'object' &&
    'pathname' in authNavigationState.from &&
    typeof authNavigationState.from.pathname === 'string'
      ? `${authNavigationState.from.pathname}${typeof authNavigationState.from.search === 'string' ? authNavigationState.from.search : ''}${typeof authNavigationState.from.hash === 'string' ? authNavigationState.from.hash : ''}`
      : null

  useEffect(() => {
    if (!isAwaitingAuthResolution || loading) {
      return
    }

    if (!isAuthenticated) {
      setIsAwaitingAuthResolution(false)
      setSubmitError('No pudimos iniciar la sesión. Intentá nuevamente.')
      return
    }

    if (!profile || !role) {
      setIsAwaitingAuthResolution(false)
      setSubmitError('La sesión se abrió, pero no pudimos resolver tu perfil.')
      return
    }

    window.location.replace(returnTo ?? getDefaultRouteByRole(role))
  }, [isAuthenticated, isAwaitingAuthResolution, loading, profile, returnTo, role])

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
        <div className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {submitError}
        </div>
      ) : null}

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
          placeholder="Ingresa tu contraseña"
          autoComplete="current-password"
          disabled={isSubmitting}
        />
        {errors.password ? (
          <p className="text-sm text-red-200">{errors.password}</p>
        ) : null}
      </label>

      <div className="flex items-center justify-end">
        <Link
          to="/forgot-password"
          className="text-sm font-medium text-brand-100/68 transition hover:text-brand-300"
        >
          Olvidé mi contraseña
        </Link>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isAwaitingAuthResolution}
        className="min-h-13 w-full rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting || isAwaitingAuthResolution
          ? 'Ingresando...'
          : 'Iniciar sesión'}
      </button>

      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-xs uppercase tracking-[0.2em] text-brand-100/42">
            o continuá con
          </p>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/4 px-5 text-sm font-medium text-brand-100/62 transition disabled:cursor-not-allowed disabled:opacity-100"
          >
            <GoogleIcon />
            <span>Continuar con Google</span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex min-h-13 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/4 px-5 text-sm font-medium text-brand-100/62 transition disabled:cursor-not-allowed disabled:opacity-100"
          >
            <AppleIcon />
            <span>Continuar con Apple</span>
          </button>
        </div>
      </div>

      <p className="text-sm text-brand-100/58">
        ¿Aún no tenés cuenta?{' '}
        <Link
          to="/register"
          state={location.state}
          className="font-medium text-brand-300 transition hover:text-brand-100"
        >
          Registrate
        </Link>
      </p>
    </form>
  )
}

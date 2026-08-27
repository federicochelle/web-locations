import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthStatusModal } from '@/components/auth/AuthStatusModal.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import {
  getAuthErrorMessage,
  signIn,
  signOutLocal,
} from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'

type LoginFormValues = {
  email: string
  password: string
}

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>

type LoginStatusModalState =
  | {
      title: string
      message: string
      primaryLabel: string
    }
  | null

const EMAIL_CONFIRMED_MODAL = {
  title: 'Correo confirmado',
  message: 'Tu correo fue confirmado correctamente. Ya podés iniciar sesión en Film Locations UY.',
  primaryLabel: 'Continuar',
} satisfies NonNullable<LoginStatusModalState>

const PASSWORD_RESET_MODAL = {
  title: 'Contraseña actualizada',
  message: 'Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con tu nueva contraseña.',
  primaryLabel: 'Continuar',
} satisfies NonNullable<LoginStatusModalState>

function getLoginErrorModal(message: string): NonNullable<LoginStatusModalState> {
  if (message.includes('confirmar tu correo electrónico')) {
    return {
      title: 'Confirmá tu correo',
      message,
      primaryLabel: 'Entendido',
    }
  }

  if (message.includes('no son correctos') || message.includes('correo electrónico')) {
    return {
      title: 'No pudimos iniciar sesión',
      message,
      primaryLabel: 'Entendido',
    }
  }

  if (message.includes('resolver tu perfil') || message.includes('preparar el inicio')) {
    return {
      title: 'No pudimos completar la solicitud',
      message,
      primaryLabel: 'Cerrar',
    }
  }

  return {
    title: 'No pudimos iniciar sesión',
    message,
    primaryLabel: 'Cerrar',
  }
}

function validateForm(values: LoginFormValues) {
  const errors: LoginFormErrors = {}

  if (!values.email.trim()) {
    errors.email = 'Ingresá tu correo electrónico.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresá un correo electrónico válido.'
  }

  if (!values.password) {
    errors.password = 'Ingresá tu contraseña.'
  }

  return errors
}

export function LoginForm() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, loading, profile, role } = useAuth()
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAwaitingAuthResolution, setIsAwaitingAuthResolution] = useState(false)
  const [statusModal, setStatusModal] = useState<LoginStatusModalState>(null)
  const [isHandlingConfirmedEmail, setIsHandlingConfirmedEmail] = useState(false)

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
    const isConfirmed = searchParams.get('confirmed') === '1'
    const isResetSuccess = searchParams.get('reset') === 'success'

    if (!isConfirmed && !isResetSuccess) {
      return
    }

    let isActive = true

    async function processStatusParams() {
      if (isConfirmed) {
        setIsHandlingConfirmedEmail(true)

        try {
          await signOutLocal()
        } catch {
          if (!isActive) {
            return
          }

          setStatusModal(
            getLoginErrorModal('No pudimos preparar el inicio de sesión. Intentá nuevamente.'),
          )
          setIsHandlingConfirmedEmail(false)
          return
        }
      }

      if (!isActive) {
        return
      }

      setStatusModal(isResetSuccess ? PASSWORD_RESET_MODAL : EMAIL_CONFIRMED_MODAL)

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('confirmed')
      nextParams.delete('reset')

      navigate(
        {
          pathname: location.pathname,
          search: nextParams.toString() ? `?${nextParams.toString()}` : '',
        },
        {
          replace: true,
          state: location.state,
        },
      )

      setIsHandlingConfirmedEmail(false)
    }

    void processStatusParams()

    return () => {
      isActive = false
    }
  }, [location.pathname, location.state, navigate, searchParams])

  useEffect(() => {
    if (!isAwaitingAuthResolution || loading || isHandlingConfirmedEmail) {
      return
    }

    if (!isAuthenticated) {
      setIsAwaitingAuthResolution(false)
      setStatusModal(
        getLoginErrorModal('No pudimos iniciar la sesión. Intentá nuevamente.'),
      )
      return
    }

    if (!profile || !role) {
      setIsAwaitingAuthResolution(false)
      setStatusModal(
        getLoginErrorModal('La sesión se abrió, pero no pudimos resolver tu perfil.'),
      )
      return
    }

    window.location.replace(returnTo ?? '/')
  }, [
    isAuthenticated,
    isAwaitingAuthResolution,
    isHandlingConfirmedEmail,
    loading,
    profile,
    returnTo,
    role,
  ])

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

      await signIn({
        email: values.email.trim(),
        password: values.password,
      })
      setIsAwaitingAuthResolution(true)
    } catch (error) {
      setStatusModal(getLoginErrorModal(getAuthErrorMessage(error)))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
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
            placeholder="Ingresá tu contraseña"
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
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isAwaitingAuthResolution}
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting || isAwaitingAuthResolution ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-brand-950/25 border-t-brand-950 motion-reduce:animate-none"
            />
          ) : null}
          {isSubmitting || isAwaitingAuthResolution
            ? 'Ingresando...'
            : 'Iniciar sesión'}
        </button>
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

      {statusModal ? (
        <AuthStatusModal
          isOpen
          title={statusModal.title}
          message={statusModal.message}
          primaryLabel={statusModal.primaryLabel}
          onPrimaryAction={() => {
            setStatusModal(null)
          }}
        />
      ) : null}
    </>
  )
}

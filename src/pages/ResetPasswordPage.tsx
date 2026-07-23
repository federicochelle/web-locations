import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import {
  AUTH_MIN_PASSWORD_LENGTH,
  exchangeCodeForSession,
  getAuthErrorMessage,
  getSession,
  onAuthStateChange,
  updatePassword,
  verifyOtpWithTokenHash,
} from '@/services/auth.service.ts'
import {
  getMinPasswordError,
  getPasswordConfirmationError,
} from '@/utils/auth-validation.ts'

type RecoveryUrlContext =
  | { kind: 'pkce'; code: string }
  | { kind: 'token_hash'; tokenHash: string }
  | { kind: 'implicit' }
  | { kind: 'invalid' }

function getRecoveryUrlContext(searchParams: URLSearchParams): RecoveryUrlContext {
  const code = searchParams.get('code')?.trim()

  if (code) {
    return { kind: 'pkce', code }
  }

  const tokenHash = searchParams.get('token_hash')?.trim()

  if (tokenHash) {
    return { kind: 'token_hash', tokenHash }
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const hashType = hashParams.get('type')
  const accessToken = hashParams.get('access_token')
  const refreshToken = hashParams.get('refresh_token')

  if (hashType === 'recovery' && accessToken && refreshToken) {
    return { kind: 'implicit' }
  }

  return { kind: 'invalid' }
}

export function ResetPasswordPage() {
  usePageTitle('Restablecer contraseña')

  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isCheckingLink, setIsCheckingLink] = useState(true)
  const [isRecoveryReady, setIsRecoveryReady] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const recoveryUrlContext = useMemo(
    () => getRecoveryUrlContext(searchParams),
    [searchParams],
  )

  useEffect(() => {
    let isMounted = true
    let recoveryTimeoutId: number | null = null

    function markRecoveryReady() {
      if (!isMounted) {
        return
      }

      setIsRecoveryReady(true)
      setIsCheckingLink(false)
      setSubmitError(null)
    }

    function markRecoveryInvalid(message: string) {
      if (!isMounted) {
        return
      }

      setIsRecoveryReady(false)
      setIsCheckingLink(false)
      setSubmitError(message)
    }

    if (recoveryUrlContext.kind === 'invalid') {
      markRecoveryInvalid('El enlace no es válido o expiró. Solicitá uno nuevo.')

      return () => {
        isMounted = false
      }
    }

    if (recoveryUrlContext.kind === 'implicit') {
      const {
        data: { subscription },
      } = onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          markRecoveryReady()
        }
      })

      recoveryTimeoutId = window.setTimeout(() => {
        if (!isMounted) {
          return
        }

        void getSession()
          .then(({ session }) => {
            if (session) {
              markRecoveryReady()
              return
            }

            markRecoveryInvalid('El enlace no es válido o expiró. Solicitá uno nuevo.')
          })
          .catch((error) => {
            markRecoveryInvalid(getAuthErrorMessage(error))
          })
      }, 1500)

      return () => {
        isMounted = false
        if (recoveryTimeoutId !== null) {
          window.clearTimeout(recoveryTimeoutId)
        }
        subscription.unsubscribe()
      }
    }

    async function resolveRecoverySession() {
      try {
        if (recoveryUrlContext.kind === 'pkce') {
          await exchangeCodeForSession(recoveryUrlContext.code)
          markRecoveryReady()
          return
        }

        if (recoveryUrlContext.kind !== 'token_hash') {
          markRecoveryInvalid('El enlace no es válido o expiró. Solicitá uno nuevo.')
          return
        }

        await verifyOtpWithTokenHash({
          token_hash: recoveryUrlContext.tokenHash,
          type: 'recovery',
        })
        markRecoveryReady()
      } catch (error) {
        markRecoveryInvalid(getAuthErrorMessage(error))
      }
    }

    void resolveRecoverySession()

    return () => {
      isMounted = false
      if (recoveryTimeoutId !== null) {
        window.clearTimeout(recoveryTimeoutId)
      }
    }
  }, [recoveryUrlContext])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let hasErrors = false

    const nextPasswordError = getMinPasswordError(
      password,
      AUTH_MIN_PASSWORD_LENGTH,
    )
    const nextConfirmPasswordError = getPasswordConfirmationError(
      password,
      confirmPassword,
    )

    setPasswordError(nextPasswordError)
    setConfirmPasswordError(nextConfirmPasswordError)

    if (nextPasswordError || nextConfirmPasswordError) {
      hasErrors = true
    }

    if (hasErrors) {
      return
    }

    try {
      setIsSubmitting(true)
      setSubmitError(null)

      await updatePassword({
        password,
      })

      navigate('/login?reset=success', { replace: true })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell title="Restablecer contraseña">
      {isCheckingLink ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[0.875rem] border border-white/10 bg-white/6 px-4 py-3 text-sm text-brand-100/72"
        >
          Validando enlace de recuperación...
        </div>
      ) : null}

      {!isCheckingLink && !isRecoveryReady ? (
        <div className="space-y-5">
          {submitError ? (
            <div
              role="alert"
              className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {submitError}
            </div>
          ) : null}

          <div className="space-y-3">
            <Link
              to="/forgot-password"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
            >
              Solicitar un nuevo enlace
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6"
            >
              Volver a iniciar sesión
            </Link>
          </div>
        </div>
      ) : null}

      {!isCheckingLink && isRecoveryReady ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {submitError ? (
            <div
              role="alert"
              className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {submitError}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
              Nueva contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setPasswordError(null)
                setSubmitError(null)
              }}
              className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f]"
              placeholder={`Mínimo ${AUTH_MIN_PASSWORD_LENGTH} caracteres`}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {passwordError ? (
              <p className="text-sm text-red-200">{passwordError}</p>
            ) : null}
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
              Confirmar contraseña
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setConfirmPasswordError(null)
                setSubmitError(null)
              }}
              className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f]"
              placeholder="Repetí tu nueva contraseña"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {confirmPasswordError ? (
              <p className="text-sm text-red-200">{confirmPasswordError}</p>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-13 w-full rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Guardando contraseña...' : 'Guardar nueva contraseña'}
          </button>
        </form>
      ) : null}
    </AuthPageShell>
  )
}

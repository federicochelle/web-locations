import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

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
  usePageTitle('Restablecer contrasena')

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
      markRecoveryInvalid('El enlace no es valido o expiro. Solicita uno nuevo.')

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

            markRecoveryInvalid('El enlace no es valido o expiro. Solicita uno nuevo.')
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
          markRecoveryInvalid('El enlace no es valido o expiro. Solicita uno nuevo.')
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
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto flex max-w-[1720px] justify-center">
        <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
              Seguridad
            </p>
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Restablecer contrasena
              </h1>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Define una nueva contrasena para continuar con tu cuenta.
              </p>
            </div>
          </div>

          {isCheckingLink ? (
            <div className="rounded-2xl border border-black/5 bg-sand-50 px-4 py-3 text-sm text-sand-700">
              Validando enlace de recuperacion...
            </div>
          ) : null}

          {!isCheckingLink && !isRecoveryReady ? (
            <div className="space-y-5">
              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {submitError}
                </div>
              ) : null}

              <Link
                to="/forgot-password"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Solicitar un nuevo enlace
              </Link>
            </div>
          ) : null}

          {!isCheckingLink && isRecoveryReady ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              {submitError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {submitError}
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Nueva contrasena
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setPasswordError(null)
                    setSubmitError(null)
                  }}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder={`Minimo ${AUTH_MIN_PASSWORD_LENGTH} caracteres`}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                {passwordError ? (
                  <p className="text-sm text-red-900">{passwordError}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Confirmar contrasena
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setConfirmPasswordError(null)
                    setSubmitError(null)
                  }}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Repite tu nueva contrasena"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
                {confirmPasswordError ? (
                  <p className="text-sm text-red-900">{confirmPasswordError}</p>
                ) : null}
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Guardando contrasena...' : 'Guardar nueva contrasena'}
              </button>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  )
}

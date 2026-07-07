import { useState } from 'react'
import { Link } from 'react-router-dom'

import { usePageTitle } from '@/hooks/usePageTitle.ts'
import {
  getAuthErrorMessage,
  requestPasswordReset,
} from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'

export function ForgotPasswordPage() {
  usePageTitle('Recuperar contrasena')

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      setEmailError('Ingresa tu email.')
      return
    }

    if (!isValidEmail(email)) {
      setEmailError('Ingresa un email valido.')
      return
    }

    try {
      setIsSubmitting(true)
      setEmailError(null)
      setSubmitError(null)

      await requestPasswordReset({
        email: email.trim(),
      })

      setSuccessMessage(
        'Te enviamos un enlace para restablecer tu contrasena. Revisa tu email.',
      )
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
              Recuperacion
            </p>
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Olvide mi contrasena
              </h1>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Ingresa tu email y te enviaremos un enlace para crear una nueva contrasena.
              </p>
            </div>
          </div>

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
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError(null)
                  setSubmitError(null)
                }}
                className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isSubmitting}
              />
              {emailError ? <p className="text-sm text-red-900">{emailError}</p> : null}
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace'}
            </button>

            <div className="flex flex-wrap gap-3 text-sm text-sand-700">
              <Link
                to="/login"
                className="font-medium text-brand-700 transition hover:text-brand-500"
              >
                Volver a login
              </Link>
              <Link
                to="/register"
                className="font-medium text-brand-700 transition hover:text-brand-500"
              >
                Crear cuenta
              </Link>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

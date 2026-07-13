import { useState } from 'react'
import { Link } from 'react-router-dom'

import { usePageTitle } from '@/hooks/usePageTitle.ts'
import {
  getAuthErrorMessage,
  requestPasswordReset,
} from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'

export function ForgotPasswordPage() {
  usePageTitle('Recuperar contraseña')

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
      setEmailError('Ingresa un email válido.')
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
        'Te enviamos un enlace para restablecer tu contraseña. Revisá tu email.',
      )
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-[1720px] items-center justify-center">
        <section className="w-full max-w-[460px] rounded-[0.875rem] border border-white/8 bg-[#1B1B1D] px-6 py-8 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.22)] sm:px-8">
          <div className="mb-8 space-y-3">
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100">
              Olvidé mi contraseña
            </h1>
          </div>

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
                className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={isSubmitting}
              />
              {emailError ? <p className="text-sm text-red-200">{emailError}</p> : null}
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-13 w-full rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Enviando enlace...' : 'Enviar enlace'}
            </button>

            <div className="flex flex-wrap gap-3 text-sm text-brand-100/58">
              <Link
                to="/register"
                className="font-medium text-brand-300 transition hover:text-brand-100"
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

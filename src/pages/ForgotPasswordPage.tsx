import { useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
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
      setEmailError('Ingresá tu correo electrónico.')
      return
    }

    if (!isValidEmail(email)) {
      setEmailError('Ingresá un correo electrónico válido.')
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
        'Te enviamos un enlace para restablecer tu contraseña. Revisá tu correo electrónico.',
      )
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell title="Recuperar contraseña">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {successMessage ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            {successMessage}
          </div>
        ) : null}

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
            Correo electrónico
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

        <div className="space-y-3 pt-1">
          <Link
            to="/login"
            className="inline-flex min-h-11 w-full items-center justify-center text-center text-sm font-medium text-brand-300 transition hover:text-brand-100"
          >
            Volver a ingresar
          </Link>
        </div>
      </form>
    </AuthPageShell>
  )
}

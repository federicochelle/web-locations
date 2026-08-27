import { useId, useState } from 'react'
import { Link } from 'react-router-dom'

import { AppModal } from '@/components/ui/AppModal.tsx'
import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { requestPasswordReset } from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'
import logoUrl from '../../logo.webp'

const RESET_NOTICE_TITLE = 'Revisá tu correo'
const RESET_NOTICE_DESCRIPTION =
  'Si existe una cuenta asociada a ese correo, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam o correo no deseado.'
const RESET_REQUEST_RATE_LIMIT_MESSAGE =
  'Solicitaste varios enlaces recientemente. Esperá un minuto antes de intentar nuevamente.'
const RESET_REQUEST_GENERIC_ERROR_MESSAGE =
  'Ocurrió un error al procesar tu solicitud. Intentá nuevamente.'

function isRateLimitedResetError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const status = 'status' in error ? error.status : undefined
  const code = 'code' in error ? error.code : undefined

  return status === 429 || code === 429 || code === '429'
}

export function ForgotPasswordPage() {
  usePageTitle('Recuperar contraseña')

  const resetNoticeTitleId = useId()
  const resetNoticeDescriptionId = useId()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isResetNoticeOpen, setIsResetNoticeOpen] = useState(false)
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
      setIsResetNoticeOpen(false)

      await requestPasswordReset({
        email: email.trim(),
      })

      setIsResetNoticeOpen(true)
    } catch (error) {
      setSubmitError(
        isRateLimitedResetError(error)
          ? RESET_REQUEST_RATE_LIMIT_MESSAGE
          : RESET_REQUEST_GENERIC_ERROR_MESSAGE,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthPageShell title="Recuperar contraseña">
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

      <AppModal
        open={isResetNoticeOpen}
        onClose={() => {}}
        titleId={resetNoticeTitleId}
        descriptionId={resetNoticeDescriptionId}
        closeOnEscape={false}
        closeOnOverlayClick={false}
        panelClassName="max-w-[30rem] border-brand-300/30 bg-[linear-gradient(180deg,rgba(27,27,29,0.98),rgba(17,17,19,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="px-5 py-6 sm:px-7 sm:py-7">
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center text-center"
          >
            <img
              src={logoUrl}
              alt="Film Locations UY"
              className="mb-5 h-auto w-24 sm:w-28"
            />
            <h2
              id={resetNoticeTitleId}
              className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-white"
            >
              {RESET_NOTICE_TITLE}
            </h2>
            <p
              id={resetNoticeDescriptionId}
              className="mt-4 max-w-md text-sm leading-6 text-brand-100/74 sm:text-base"
            >
              {RESET_NOTICE_DESCRIPTION}
            </p>
            <Link
              to="/login"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-brand-300/35 bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 sm:w-auto sm:min-w-48"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </AppModal>
    </>
  )
}

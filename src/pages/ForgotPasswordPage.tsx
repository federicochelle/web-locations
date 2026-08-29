import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { AuthStatusModal } from '@/components/auth/AuthStatusModal.tsx'
import { AuthPageShell } from '@/components/auth/AuthPageShell.tsx'
import { usePageSeo } from '@/hooks/usePageSeo.ts'
import { requestPasswordReset } from '@/services/auth.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'

const RESET_NOTICE_TITLE = 'Revisá tu correo'
const RESET_NOTICE_DESCRIPTION =
  'Si existe una cuenta asociada a ese correo, te enviamos un enlace para restablecer tu contraseña. Revisá también la carpeta de spam o correo no deseado.'
const RESET_REQUEST_RATE_LIMIT_MESSAGE =
  'Solicitaste varios enlaces recientemente. Esperá un minuto antes de intentar nuevamente.'
const RESET_REQUEST_GENERIC_ERROR_MESSAGE =
  'Ocurrió un error al procesar tu solicitud. Intentá nuevamente.'

type ForgotPasswordModalState = {
  title: string
  message: string
  primaryLabel: string
}

function getForgotPasswordErrorModal(message: string): ForgotPasswordModalState {
  if (message === RESET_REQUEST_RATE_LIMIT_MESSAGE) {
    return {
      title: 'Esperá un momento',
      message,
      primaryLabel: 'Entendido',
    }
  }

  return {
    title: 'No pudimos completar la solicitud',
    message,
    primaryLabel: 'Cerrar',
  }
}

function isRateLimitedResetError(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const status = 'status' in error ? error.status : undefined
  const code = 'code' in error ? error.code : undefined

  return status === 429 || code === 429 || code === '429'
}

export function ForgotPasswordPage() {
  usePageSeo({
    title: 'Recuperar contraseña',
    description: 'Recuperación de acceso a Film Locations Uruguay.',
    canonicalPath: '/forgot-password',
    robots: 'noindex,nofollow',
  })

  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [isResetNoticeOpen, setIsResetNoticeOpen] = useState(false)
  const [errorModal, setErrorModal] = useState<ForgotPasswordModalState | null>(null)
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
      setIsResetNoticeOpen(false)
      setErrorModal(null)

      await requestPasswordReset({
        email: email.trim(),
      })

      setIsResetNoticeOpen(true)
    } catch (error) {
      setErrorModal(
        getForgotPasswordErrorModal(
          isRateLimitedResetError(error)
            ? RESET_REQUEST_RATE_LIMIT_MESSAGE
            : RESET_REQUEST_GENERIC_ERROR_MESSAGE,
        ),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AuthPageShell title="Recuperar contraseña">
        <form className="space-y-5" onSubmit={handleSubmit}>
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

      <AuthStatusModal
        isOpen={isResetNoticeOpen}
        title={RESET_NOTICE_TITLE}
        message={RESET_NOTICE_DESCRIPTION}
        primaryLabel="Ir a iniciar sesión"
        onPrimaryAction={() => {
          navigate('/login')
        }}
      />

      {errorModal ? (
        <AuthStatusModal
          isOpen
          title={errorModal.title}
          message={errorModal.message}
          primaryLabel={errorModal.primaryLabel}
          onPrimaryAction={() => {
            setErrorModal(null)
          }}
        />
      ) : null}
    </>
  )
}

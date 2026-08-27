import { useId, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import {
  AUTH_MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  REGISTRATION_TERMS_VERSION,
  signUp,
} from '@/services/auth.service.ts'
import { AppModal } from '@/components/ui/AppModal.tsx'
import {
  getMinPasswordError,
  getPasswordConfirmationError,
  isValidEmail,
} from '@/utils/auth-validation.ts'
import logoUrl from '../../../logo.webp'

type RegisterFormValues = {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  acceptedTerms: boolean
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>

const REGISTRATION_NOTICE_TITLE = 'Revisá tu correo'
const REGISTRATION_NOTICE_DESCRIPTION =
  'Si el correo ingresado puede registrarse, te enviamos un enlace para confirmar tu cuenta. Revisá también la carpeta de spam o correo no deseado.'

function validateForm(values: RegisterFormValues) {
  const errors: RegisterFormErrors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'Ingresá tu nombre completo.'
  }

  if (!values.email.trim()) {
    errors.email = 'Ingresá tu correo electrónico.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresá un correo electrónico válido.'
  }

  const passwordError = getMinPasswordError(
    values.password,
    AUTH_MIN_PASSWORD_LENGTH,
  )

  if (passwordError) {
    errors.password = passwordError
  }

  const confirmPasswordError = getPasswordConfirmationError(
    values.password,
    values.confirmPassword,
  )

  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = 'Debés aceptar los Términos y Condiciones y la Política de Privacidad.'
  }

  return errors
}

export function RegisterForm() {
  const location = useLocation()
  const registrationNoticeTitleId = useId()
  const registrationNoticeDescriptionId = useId()
  const [values, setValues] = useState<RegisterFormValues>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isRegistrationNoticeOpen, setIsRegistrationNoticeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange<Field extends keyof RegisterFormValues>(
    field: Field,
    nextValue: RegisterFormValues[Field],
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
      setIsRegistrationNoticeOpen(false)

      await signUp({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim() || null,
        password: values.password,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: REGISTRATION_TERMS_VERSION,
      })

      setIsRegistrationNoticeOpen(true)
      setValues({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        acceptedTerms: false,
      })
    } catch (error) {
      setSubmitError(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
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
            Nombre completo
          </span>
          <input
            type="text"
            value={values.fullName}
            onChange={(event) => handleChange('fullName', event.target.value)}
            className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
            placeholder="Tu nombre completo"
            autoComplete="name"
            disabled={isSubmitting}
          />
          {errors.fullName ? (
            <p className="text-sm text-red-200">{errors.fullName}</p>
          ) : null}
        </label>

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
          {errors.email ? (
            <p className="text-sm text-red-200">{errors.email}</p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
            Teléfono
          </span>
          <input
            type="tel"
            value={values.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
            className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
            placeholder="099 123 456"
            autoComplete="tel"
            disabled={isSubmitting}
          />
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
            placeholder={`Mínimo ${AUTH_MIN_PASSWORD_LENGTH} caracteres`}
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          {errors.password ? (
            <p className="text-sm text-red-200">{errors.password}</p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/56">
            Confirmar contraseña
          </span>
          <input
            type="password"
            value={values.confirmPassword}
            onChange={(event) => handleChange('confirmPassword', event.target.value)}
            className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
            disabled={isSubmitting}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-red-200">{errors.confirmPassword}</p>
          ) : null}
        </label>

        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-[1rem] border border-white/8 bg-[#151517] px-4 py-3 text-sm text-brand-100">
            <input
              type="checkbox"
              checked={values.acceptedTerms}
              onChange={(event) =>
                handleChange('acceptedTerms', event.target.checked)
              }
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-brand-300"
              disabled={isSubmitting}
            />
            <span className="leading-6 text-brand-100/84">
              Acepto los{' '}
              <Link
                to="/terminos"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-300 transition hover:text-brand-100"
              >
                Términos y Condiciones
              </Link>{' '}
              y la{' '}
              <Link
                to="/privacidad"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-300 transition hover:text-brand-100"
              >
                Política de Privacidad
              </Link>
            </span>
          </label>
          {errors.acceptedTerms ? (
            <p className="text-sm text-red-200">{errors.acceptedTerms}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-13 w-full rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p className="text-sm text-brand-100/58">
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-medium text-brand-300 transition hover:text-brand-100"
          >
            Iniciá sesión
          </Link>
        </p>
      </form>

      <AppModal
        open={isRegistrationNoticeOpen}
        onClose={() => {}}
        titleId={registrationNoticeTitleId}
        descriptionId={registrationNoticeDescriptionId}
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
              id={registrationNoticeTitleId}
              className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-white"
            >
              {REGISTRATION_NOTICE_TITLE}
            </h2>
            <p
              id={registrationNoticeDescriptionId}
              className="mt-4 max-w-md text-sm leading-6 text-brand-100/74 sm:text-base"
            >
              {REGISTRATION_NOTICE_DESCRIPTION}
            </p>
            <Link
              to="/login"
              state={location.state}
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

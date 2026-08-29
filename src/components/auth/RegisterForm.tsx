import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import {
  AUTH_MIN_PASSWORD_LENGTH,
  getAuthErrorMessage,
  REGISTRATION_TERMS_VERSION,
  signUp,
} from '@/services/auth.service.ts'
import { AuthStatusModal } from '@/components/auth/AuthStatusModal.tsx'
import { PhoneInput } from '@/components/ui/PhoneInput.tsx'
import {
  getMinPasswordError,
  getPasswordConfirmationError,
  isValidEmail,
} from '@/utils/auth-validation.ts'
import { getPhoneError, normalizePhoneForStorage } from '@/utils/phone.ts'

type RegisterFormValues = {
  fullName: string
  companyName: string
  email: string
  phone?: string
  password: string
  confirmPassword: string
  acceptedTerms: boolean
}

type RegisterFormErrors = Partial<Record<keyof RegisterFormValues, string>>
type RegisterModalState = {
  title: string
  message: string
  primaryLabel: string
}

const REGISTRATION_NOTICE_TITLE = 'Revisá tu correo'
const REGISTRATION_NOTICE_DESCRIPTION =
  'Si el correo ingresado puede registrarse, te enviamos un enlace para confirmar tu cuenta. Revisá también la carpeta de spam o correo no deseado.'

function getRegisterErrorModal(message: string): RegisterModalState {
  if (message.includes('Ya existe una cuenta registrada')) {
    return {
      title: 'No pudimos crear la cuenta',
      message,
      primaryLabel: 'Entendido',
    }
  }

  if (message.includes('contraseña')) {
    return {
      title: 'Revisá los datos',
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

function validateForm(values: RegisterFormValues) {
  const errors: RegisterFormErrors = {}

  if (!values.fullName.trim()) {
    errors.fullName = 'Ingresá tu nombre completo.'
  }

  if (!values.companyName.trim()) {
    errors.companyName = 'Ingresá el nombre de tu productora.'
  }

  if (!values.email.trim()) {
    errors.email = 'Ingresá tu correo electrónico.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Ingresá un correo electrónico válido.'
  }

  const phoneError = getPhoneError(values.phone)

  if (phoneError) {
    errors.phone = phoneError
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
  const navigate = useNavigate()
  const [values, setValues] = useState<RegisterFormValues>({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  })
  const [errors, setErrors] = useState<RegisterFormErrors>({})
  const [isRegistrationNoticeOpen, setIsRegistrationNoticeOpen] = useState(false)
  const [errorModal, setErrorModal] = useState<RegisterModalState | null>(null)
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
      setIsRegistrationNoticeOpen(false)
      setErrorModal(null)

      await signUp({
        fullName: values.fullName.trim(),
        companyName: values.companyName.trim(),
        email: values.email.trim(),
        phone: normalizePhoneForStorage(values.phone),
        password: values.password,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: REGISTRATION_TERMS_VERSION,
      })

      setIsRegistrationNoticeOpen(true)
      setValues({
        fullName: '',
        companyName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        acceptedTerms: false,
      })
    } catch (error) {
      setErrorModal(getRegisterErrorModal(getAuthErrorMessage(error)))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
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
            Productora
          </span>
          <input
            type="text"
            value={values.companyName}
            onChange={(event) => handleChange('companyName', event.target.value)}
            className="min-h-13 w-full rounded-2xl border border-white/8 bg-[#151517] px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300 focus:bg-[#1b1b1f] [&:-webkit-autofill]:[-webkit-text-fill-color:#f2e7d8] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#151517_inset] [&:-webkit-autofill:hover]:[box-shadow:0_0_0_1000px_#1b1b1f_inset] [&:-webkit-autofill:focus]:[box-shadow:0_0_0_1000px_#1b1b1f_inset]"
            placeholder="Nombre de tu productora"
            autoComplete="organization"
            disabled={isSubmitting}
          />
          {errors.companyName ? (
            <p className="text-sm text-red-200">{errors.companyName}</p>
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
          <PhoneInput
            value={values.phone}
            onChange={(nextValue) => handleChange('phone', nextValue)}
            disabled={isSubmitting}
            placeholder="099 123 456"
            autoComplete="tel"
            ariaInvalid={Boolean(errors.phone)}
            ariaDescribedBy={errors.phone ? 'register-phone-error' : undefined}
            variant="auth"
          />
          {errors.phone ? (
            <p id="register-phone-error" className="text-sm text-red-200">
              {errors.phone}
            </p>
          ) : null}
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

      <AuthStatusModal
        isOpen={isRegistrationNoticeOpen}
        title={REGISTRATION_NOTICE_TITLE}
        message={REGISTRATION_NOTICE_DESCRIPTION}
        primaryLabel="Ir a iniciar sesión"
        onPrimaryAction={() => {
          navigate('/login', { state: location.state })
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

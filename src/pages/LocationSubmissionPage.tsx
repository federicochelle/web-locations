import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import submissionFooterBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM (1).webp'
import submissionHeaderBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.38 PM (2).webp'
import { SubmissionLoadingModal } from '@/components/submissions/SubmissionLoadingModal.tsx'
import { SubmissionImagesField } from '@/components/submissions/SubmissionImagesField.tsx'
import { SubmissionResultModal } from '@/components/submissions/SubmissionResultModal.tsx'
import { SubmissionTurnstile } from '@/components/submissions/SubmissionTurnstile.tsx'
import { useSubmissionImages } from '@/hooks/useSubmissionImages.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import {
  createLocationSubmission,
  getLocationSubmissionErrorMessage,
} from '@/services/location-submissions.service.ts'
import { isValidEmail } from '@/utils/auth-validation.ts'

type LocationSubmissionValues = {
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  location: string
  description: string
}

type LocationSubmissionErrors = Partial<
  Record<'ownerName' | 'ownerEmail' | 'ownerPhone' | 'location' | 'description', string>
>

type SubmissionResult =
  | { type: 'success' }
  | { type: 'partial-success' }
  | { type: 'error'; message: string }
  | null

const INITIAL_VALUES: LocationSubmissionValues = {
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  location: '',
  description: '',
}

const formPanelOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const formPanelHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

const formPrimaryButtonClassName =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 px-4.5 text-sm font-medium text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_32px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-14px_32px_rgba(0,0,0,0.18),0_14px_28px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]'
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() || ''

function FormActionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h13" />
      <path d="m11 5 7 7-7 7" />
    </svg>
  )
}

function validateForm(values: LocationSubmissionValues) {
  const errors: LocationSubmissionErrors = {}

  if (!values.ownerName.trim()) {
    errors.ownerName = 'Ingresa tu nombre.'
  }

  if (!values.ownerEmail.trim()) {
    errors.ownerEmail = 'Ingresa tu email.'
  } else if (!isValidEmail(values.ownerEmail)) {
    errors.ownerEmail = 'Ingresa un email válido.'
  }

  if (!values.ownerPhone.trim()) {
    errors.ownerPhone = 'Ingresa tu teléfono.'
  }

  if (!values.location.trim()) {
    errors.location = 'Ingresa la ubicación de la locación.'
  }

  if (!values.description.trim()) {
    errors.description = 'Agrega una descripción de la locación.'
  }

  return errors
}

export function LocationSubmissionPage() {
  usePageTitle('Postular mi locacion')

  const navigate = useNavigate()
  const firstFieldRef = useRef<HTMLInputElement | null>(null)
  const [values, setValues] = useState<LocationSubmissionValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<LocationSubmissionErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionPhase, setSubmissionPhase] = useState<'saving' | 'uploading'>('saving')
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState<string | null>(null)
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
  const {
    items: submissionImages,
    isUploading,
    selectionError,
    addFiles,
    removeItem,
    resetItems,
    uploadImages,
  } = useSubmissionImages()

  useEffect(() => {
    if (!submissionResult) {
      return
    }

    if (submissionResult.type === 'success' || submissionResult.type === 'partial-success') {
      setErrors({})
    }
  }, [submissionResult])

  const handleTurnstileTokenChange = useCallback((nextToken: string | null) => {
    setTurnstileToken(nextToken)
    setTurnstileError(null)
  }, [])

  function handleChange<Field extends keyof LocationSubmissionValues>(
    field: Field,
    nextValue: LocationSubmissionValues[Field],
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }))

    setErrors((currentErrors) => ({
      ...currentErrors,
      [field]: undefined,
    }))

    if (submissionResult?.type === 'error') {
      setSubmissionResult(null)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting || isUploading) {
      return
    }

    const nextErrors = validateForm(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    if (!turnstileSiteKey) {
      setTurnstileError(
        'No pudimos cargar la verificacion anti-spam. Intenta nuevamente en unos minutos.',
      )
      return
    }

    if (!turnstileToken) {
      setTurnstileError('Confirma que no eres un bot e intenta nuevamente.')
      return
    }

    try {
      setIsSubmitting(true)
      setSubmissionPhase('saving')
      setSubmissionResult(null)

      const hadImageErrorsBeforeSubmit = submissionImages.some(
        (item) => item.status === 'error',
      )

      const submission = await createLocationSubmission({
        ownerName: values.ownerName,
        ownerEmail: values.ownerEmail,
        ownerPhone: values.ownerPhone,
        address: values.location,
        description: values.description,
        turnstileToken,
      })

      let hasPartialImageFailure = hadImageErrorsBeforeSubmit

      if (submissionImages.length > 0) {
        setSubmissionPhase('uploading')
        const uploadSummary = await uploadImages({
          submissionId: submission.submissionId,
          submissionToken: submission.submissionToken,
        })

        if (uploadSummary.failedCount > 0) {
          hasPartialImageFailure = true
        }
      }

      setValues(INITIAL_VALUES)
      setErrors({})
      resetItems()
      setTurnstileToken(null)
      setTurnstileError(null)
      setTurnstileResetSignal((currentValue) => currentValue + 1)
      setSubmissionResult(
        hasPartialImageFailure
          ? { type: 'partial-success' }
          : { type: 'success' },
      )
    } catch (error) {
      setSubmissionResult({
        type: 'error',
        message: await getLocationSubmissionErrorMessage(error),
      })
      setTurnstileToken(null)
      setTurnstileResetSignal((currentValue) => currentValue + 1)
    } finally {
      setIsSubmitting(false)
      setSubmissionPhase('saving')
    }
  }

  function handleSubmitAnotherLocation() {
    setSubmissionResult(null)

    window.requestAnimationFrame(() => {
      firstFieldRef.current?.focus()
    })
  }

  function handleCloseResultModal() {
    setSubmissionResult(null)

    if (submissionResult?.type === 'error') {
      window.requestAnimationFrame(() => {
        firstFieldRef.current?.focus()
      })
    }
  }

  return (
    <div className="relative left-1/2 w-screen min-h-[calc(100vh-4.5rem)] -translate-x-1/2 bg-black px-0 py-5 sm:min-h-[calc(100vh-5rem)] sm:px-6 lg:px-8 lg:py-8">
      <form
        className="mx-auto w-full max-w-6xl"
        onSubmit={handleSubmit}
      >
        <section className="overflow-hidden rounded-[0.3rem] border border-white/10 bg-white/4 shadow-[0_26px_80px_rgba(0,0,0,0.34)] backdrop-blur-[2px]">
          <header className="relative overflow-hidden border-b border-white/10">
            <div className="absolute inset-0" aria-hidden="true">
              <img
                src={submissionHeaderBackgroundUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/46" />
              <div className={formPanelOverlayClassName} />
              <div className={formPanelHighlightClassName} />
            </div>
            <div className="relative px-5 py-5 sm:px-6">
              <div className="max-w-3xl">
                <h1 className="font-display text-[2rem] font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-[2.35rem]">
                  Postula tu locación
                </h1>
              </div>
            </div>
          </header>

          <div className="space-y-8 px-5 py-5 sm:space-y-10 sm:px-6">
            <section className="space-y-6 border-b border-white/10 pb-8 sm:pb-10">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                    Nombre
                  </span>
                  <input
                    ref={firstFieldRef}
                    type="text"
                    value={values.ownerName}
                    onChange={(event) => handleChange('ownerName', event.target.value)}
                    maxLength={120}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Tu nombre completo"
                    autoComplete="name"
                    disabled={isSubmitting}
                  />
                  {errors.ownerName ? (
                    <p className="text-sm text-red-900">{errors.ownerName}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                    Email
                  </span>
                  <input
                    type="email"
                    value={values.ownerEmail}
                    onChange={(event) => handleChange('ownerEmail', event.target.value)}
                    maxLength={320}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                  />
                  {errors.ownerEmail ? (
                    <p className="text-sm text-red-900">{errors.ownerEmail}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                    Teléfono
                  </span>
                  <input
                    type="tel"
                    value={values.ownerPhone}
                    onChange={(event) => handleChange('ownerPhone', event.target.value)}
                    maxLength={40}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Tu teléfono de contacto"
                    autoComplete="tel"
                    disabled={isSubmitting}
                  />
                  {errors.ownerPhone ? (
                    <p className="text-sm text-red-900">{errors.ownerPhone}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                    Ubicación
                  </span>
                  <input
                    type="text"
                    value={values.location}
                    onChange={(event) => handleChange('location', event.target.value)}
                    maxLength={200}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Ej. Carrasco, Montevideo"
                    disabled={isSubmitting}
                  />
                  {errors.location ? (
                    <p className="text-sm text-red-900">{errors.location}</p>
                  ) : null}
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                  Descripción
                </span>
                <textarea
                  value={values.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  maxLength={4000}
                  className="min-h-40 w-full rounded-[1rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                  placeholder="Contanos como es el espacio, que ambientes tiene y cualquier detalle relevante."
                  disabled={isSubmitting}
                />
                {errors.description ? (
                  <p className="text-sm text-red-900">{errors.description}</p>
                ) : null}
              </label>
            </section>

            <section className="space-y-5">
              <SubmissionImagesField
                items={submissionImages}
                selectionError={selectionError}
                disabled={isSubmitting || isUploading}
                onFilesSelected={addFiles}
                onRemove={removeItem}
              />
            </section>
          </div>

          <footer className="relative overflow-hidden border-t border-white/10">
            <div className="absolute inset-0" aria-hidden="true">
              <img
                src={submissionFooterBackgroundUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/46" />
              <div className={formPanelOverlayClassName} />
              <div className={formPanelHighlightClassName} />
            </div>
            <div className="relative px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                <div className="min-w-0 flex-1">
                  <SubmissionTurnstile
                    siteKey={turnstileSiteKey}
                    resetSignal={turnstileResetSignal}
                    errorMessage={turnstileError}
                    onTokenChange={handleTurnstileTokenChange}
                  />
                </div>
                <div className="w-full lg:min-w-0 lg:flex-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || isUploading}
                    className={formPrimaryButtonClassName}
                  >
                    <FormActionIcon />
                    {isSubmitting || isUploading
                      ? 'Enviando postulacion...'
                      : 'Enviar postulacion'}
                  </button>
                </div>
              </div>
            </div>
          </footer>
        </section>
      </form>

      <SubmissionLoadingModal isOpen={isSubmitting} phase={submissionPhase} />

      <SubmissionResultModal
        isOpen={submissionResult !== null}
        variant={submissionResult?.type === 'error' ? 'error' : submissionResult?.type === 'partial-success' ? 'partial-success' : 'success'}
        title={
          submissionResult?.type === 'error'
            ? 'No pudimos enviar la postulacion'
            : submissionResult?.type === 'partial-success'
            ? 'La postulacion fue enviada'
            : '¡Recibimos tu postulacion!'
        }
        description={
          submissionResult?.type === 'error'
            ? submissionResult.message
            : submissionResult?.type === 'partial-success'
            ? 'Guardamos tus datos, pero algunas imagenes no pudieron completarse.'
            : 'Nuestro equipo revisara la informacion y se pondra en contacto contigo.'
        }
        primaryActionLabel={
          submissionResult?.type === 'error' ? 'Volver al formulario' : 'Volver al inicio'
        }
        secondaryActionLabel={
          submissionResult?.type === 'error' ? undefined : 'Postular otra locacion'
        }
        onPrimaryAction={() => {
          if (submissionResult?.type === 'error') {
            handleCloseResultModal()
            return
          }

          navigate('/')
        }}
        onSecondaryAction={
          submissionResult?.type === 'error' ? undefined : handleSubmitAnotherLocation
        }
        onClose={handleCloseResultModal}
      />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { SubmissionLoadingModal } from '@/components/submissions/SubmissionLoadingModal.tsx'
import { SubmissionImagesField } from '@/components/submissions/SubmissionImagesField.tsx'
import { SubmissionResultModal } from '@/components/submissions/SubmissionResultModal.tsx'
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

function buildSubmissionTitle(values: LocationSubmissionValues) {
  const normalizedDescription = values.description.trim()

  if (normalizedDescription) {
    const words = normalizedDescription.split(/\s+/).filter(Boolean).slice(0, 6)

    if (words.length > 0) {
      return words.join(' ')
    }
  }

  const normalizedLocation = values.location.trim()

  if (normalizedLocation) {
    return normalizedLocation
  }

  return `Postulacion de ${values.ownerName.trim()}`
}

function validateForm(values: LocationSubmissionValues) {
  const errors: LocationSubmissionErrors = {}

  if (!values.ownerName.trim()) {
    errors.ownerName = 'Ingresa tu nombre.'
  }

  if (!values.ownerEmail.trim()) {
    errors.ownerEmail = 'Ingresa tu email.'
  } else if (!isValidEmail(values.ownerEmail)) {
    errors.ownerEmail = 'Ingresa un email valido.'
  }

  if (!values.ownerPhone.trim()) {
    errors.ownerPhone = 'Ingresa tu telefono.'
  }

  if (!values.location.trim()) {
    errors.location = 'Ingresa la ubicacion de la locacion.'
  }

  if (!values.description.trim()) {
    errors.description = 'Agrega una descripcion de la locacion.'
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
        title: buildSubmissionTitle(values),
        address: values.location,
        description: values.description,
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
      setSubmissionResult(
        hasPartialImageFailure
          ? { type: 'partial-success' }
          : { type: 'success' },
      )
    } catch (error) {
      setSubmissionResult({
        type: 'error',
        message: getLocationSubmissionErrorMessage(error),
      })
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
    <div className="relative left-1/2 w-screen min-h-[calc(100vh-4.5rem)] -translate-x-1/2 bg-black px-4 py-10 sm:min-h-[calc(100vh-5rem)] sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
              Postula tu locacion
            </h1>
          </div>

          <form className="space-y-8 sm:space-y-10" onSubmit={handleSubmit}>
            <section className="space-y-6 rounded-[1rem] border border-white/8 bg-[#1B1B1D] p-5 sm:p-6">
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
                    Telefono
                  </span>
                  <input
                    type="tel"
                    value={values.ownerPhone}
                    onChange={(event) => handleChange('ownerPhone', event.target.value)}
                    className="min-h-13 w-full rounded-2xl border border-white/10 bg-white/6 px-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                    placeholder="Tu telefono de contacto"
                    autoComplete="tel"
                    disabled={isSubmitting}
                  />
                  {errors.ownerPhone ? (
                    <p className="text-sm text-red-900">{errors.ownerPhone}</p>
                  ) : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                    Ubicacion
                  </span>
                  <input
                    type="text"
                    value={values.location}
                    onChange={(event) => handleChange('location', event.target.value)}
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
                <textarea
                  value={values.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="min-h-40 w-full rounded-[1rem] border border-white/10 bg-white/6 px-4 py-4 text-sm text-brand-100 outline-none transition placeholder:text-brand-100/32 focus:border-brand-300"
                  placeholder="Contanos como es el espacio, que ambientes tiene y cualquier detalle relevante."
                  disabled={isSubmitting}
                />
                {errors.description ? (
                  <p className="text-sm text-red-900">{errors.description}</p>
                ) : null}
              </label>
            </section>

            <section className="space-y-5 rounded-[1rem] border border-white/8 bg-[#1B1B1D] p-5 sm:p-6">
              <SubmissionImagesField
                items={submissionImages}
                selectionError={selectionError}
                disabled={isSubmitting || isUploading}
                onFilesSelected={addFiles}
                onRemove={removeItem}
              />
            </section>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="mt-2 min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting || isUploading
                ? 'Enviando postulacion...'
                : 'Enviar postulacion'}
            </button>
          </form>
        </section>
      </div>

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

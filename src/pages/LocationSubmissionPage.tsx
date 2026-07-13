import { useState } from 'react'

import { SubmissionImagesField } from '@/components/submissions/SubmissionImagesField.tsx'
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

  const [values, setValues] = useState<LocationSubmissionValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<LocationSubmissionErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    items: submissionImages,
    isUploading,
    selectionError,
    addFiles,
    removeItem,
    resetItems,
    uploadImages,
  } = useSubmissionImages()

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
      setSuccessMessage(null)

      const submission = await createLocationSubmission({
        ownerName: values.ownerName,
        ownerEmail: values.ownerEmail,
        ownerPhone: values.ownerPhone,
        title: buildSubmissionTitle(values),
        address: values.location,
        description: values.description,
      })

      let uploadMessage = ''

      if (submissionImages.length > 0) {
        const uploadSummary = await uploadImages({
          submissionId: submission.submissionId,
          submissionToken: submission.submissionToken,
        })

        if (uploadSummary.uploadedCount > 0 && uploadSummary.failedCount === 0) {
          uploadMessage = ` Tambien recibimos ${uploadSummary.uploadedCount} imagen${uploadSummary.uploadedCount === 1 ? '' : 'es'} de evaluacion.`
        }

        if (uploadSummary.uploadedCount > 0 && uploadSummary.failedCount > 0) {
          uploadMessage = ` Subimos ${uploadSummary.uploadedCount} imagen${uploadSummary.uploadedCount === 1 ? '' : 'es'}, pero ${uploadSummary.failedCount} no pudieron completarse.`
        }

        if (uploadSummary.uploadedCount === 0 && uploadSummary.failedCount > 0) {
          uploadMessage =
            ' La postulacion se guardo, pero las imagenes no pudieron completarse.'
        }
      }

      setSuccessMessage(
        `Recibimos tu postulacion. El equipo revisara la informacion y podra contactarte.${uploadMessage}`,
      )
      setValues(INITIAL_VALUES)
      resetItems()
    } catch (error) {
      setSubmitError(getLocationSubmissionErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto w-full max-w-6xl space-y-8 sm:space-y-10">
          <div>
            <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
              Postula tu locacion
            </h1>
          </div>

          <form className="space-y-8 sm:space-y-10" onSubmit={handleSubmit}>
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

            <section className="space-y-6 rounded-[1rem] border border-white/8 bg-[#1B1B1D] p-5 sm:p-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-brand-100/58">
                    Nombre
                  </span>
                  <input
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
    </div>
  )
}

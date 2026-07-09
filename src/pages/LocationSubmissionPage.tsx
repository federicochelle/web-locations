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
  title: string
  department: string
  zone: string
  address: string
  locationType: string
  description: string
  message: string
}

type LocationSubmissionErrors = Partial<
  Record<'ownerName' | 'ownerEmail' | 'ownerPhone' | 'title', string>
>

const INITIAL_VALUES: LocationSubmissionValues = {
  ownerName: '',
  ownerEmail: '',
  ownerPhone: '',
  title: '',
  department: '',
  zone: '',
  address: '',
  locationType: '',
  description: '',
  message: '',
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

  if (!values.title.trim()) {
    errors.title = 'Ingresa un titulo para la locacion.'
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

      const submission = await createLocationSubmission(values)

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
      <div className="mx-auto flex max-w-[1720px] justify-center">
        <section className="w-full max-w-3xl rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-700">
              Convocatoria
            </p>
            <div className="space-y-2">
              <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Postular mi locacion
              </h1>
              <p className="text-sm leading-6 text-sand-700 sm:text-base">
                Comparte los datos basicos de tu espacio y nuestro equipo evaluara si encaja
                dentro de la plataforma.
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
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

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Nombre
                </span>
                <input
                  type="text"
                  value={values.ownerName}
                  onChange={(event) => handleChange('ownerName', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                  disabled={isSubmitting}
                />
                {errors.ownerName ? (
                  <p className="text-sm text-red-900">{errors.ownerName}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Email
                </span>
                <input
                  type="email"
                  value={values.ownerEmail}
                  onChange={(event) => handleChange('ownerEmail', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                />
                {errors.ownerEmail ? (
                  <p className="text-sm text-red-900">{errors.ownerEmail}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Telefono
                </span>
                <input
                  type="tel"
                  value={values.ownerPhone}
                  onChange={(event) => handleChange('ownerPhone', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Tu telefono de contacto"
                  autoComplete="tel"
                  disabled={isSubmitting}
                />
                {errors.ownerPhone ? (
                  <p className="text-sm text-red-900">{errors.ownerPhone}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Titulo
                </span>
                <input
                  type="text"
                  value={values.title}
                  onChange={(event) => handleChange('title', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Ej. Casa de campo con vistas abiertas"
                  disabled={isSubmitting}
                />
                {errors.title ? <p className="text-sm text-red-900">{errors.title}</p> : null}
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Departamento
                </span>
                <input
                  type="text"
                  value={values.department}
                  onChange={(event) => handleChange('department', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Montevideo, Maldonado, Canelones..."
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Zona
                </span>
                <input
                  type="text"
                  value={values.zone}
                  onChange={(event) => handleChange('zone', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Barrio, balneario o referencia"
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Direccion
                </span>
                <input
                  type="text"
                  value={values.address}
                  onChange={(event) => handleChange('address', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Direccion o referencia exacta"
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Tipo de locacion
                </span>
                <input
                  type="text"
                  value={values.locationType}
                  onChange={(event) => handleChange('locationType', event.target.value)}
                  className="min-h-12 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Casa, campo, oficina, galpon, playa..."
                  disabled={isSubmitting}
                />
              </label>

              <div className="sm:col-span-2">
                <SubmissionImagesField
                  items={submissionImages}
                  selectionError={selectionError}
                  disabled={isSubmitting || isUploading}
                  onFilesSelected={addFiles}
                  onRemove={removeItem}
                />
              </div>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Descripcion
                </span>
                <textarea
                  value={values.description}
                  onChange={(event) => handleChange('description', event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Describe el espacio, sus ambientes, estilo y cualquier detalle relevante."
                  disabled={isSubmitting}
                />
              </label>

              <label className="block space-y-2 sm:col-span-2">
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-sand-700">
                  Mensaje
                </span>
                <textarea
                  value={values.message}
                  onChange={(event) => handleChange('message', event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
                  placeholder="Si quieres, cuentanos horarios, disponibilidad o cualquier contexto adicional."
                  disabled={isSubmitting}
                />
                <p className="text-sm text-sand-700">
                  La descripcion o un mensaje adicional ayudan a evaluar mejor la postulacion.
                </p>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="min-h-12 w-full rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
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

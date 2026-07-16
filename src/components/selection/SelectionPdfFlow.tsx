import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import type {
  SelectionPdfExportResult,
  SelectionPdfFailedImage,
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
  SelectionPdfFlowStep,
  SelectionPdfLocation,
  SelectionPdfPayload,
  SelectionPdfProgress,
} from '@/types/selection-pdf.ts'

type SelectionPdfFlowProps = {
  onBack: () => void
  onClose: () => void
}

const initialValues: SelectionPdfFormValues = {
  product: '',
  productionCompany: '',
  locationManager: '',
  email: '',
}

function sortGroupImages(images: SelectedLocationImage[]) {
  return [...images].sort((left, right) => {
    const leftSortOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
    const rightSortOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder
    }

    return left.selectedAt.localeCompare(right.selectedAt)
  })
}

function groupImagesByLocation(images: SelectedLocationImage[]) {
  const sortedImages = sortGroupImages(images)
  const groupedSelections = new Map<string, SelectionPdfLocation>()

  for (const image of sortedImages) {
    const existingGroup = groupedSelections.get(image.locationId)

    if (existingGroup) {
      existingGroup.images.push({
        key: image.key,
        imageUrl: image.imageUrl,
        sortOrder: image.sortOrder,
      })
      continue
    }

    groupedSelections.set(image.locationId, {
      locationId: image.locationId,
      locationCode: image.locationCode,
      locationTitle: image.locationTitle,
      categorySlug: image.categorySlug,
      images: [
        {
          key: image.key,
          imageUrl: image.imageUrl,
          sortOrder: image.sortOrder,
        },
      ],
    })
  }

  return [...groupedSelections.values()]
}

function normalizeValue(value: string) {
  return value.trim()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
}

function validateForm(values: SelectionPdfFormValues): SelectionPdfFormErrors {
  const nextErrors: SelectionPdfFormErrors = {}
  const normalizedValues = {
    product: normalizeValue(values.product),
    productionCompany: normalizeValue(values.productionCompany),
    locationManager: normalizeValue(values.locationManager),
    email: normalizeValue(values.email),
  }

  if (!normalizedValues.product) {
    nextErrors.product = 'Ingresa el producto.'
  }

  if (!normalizedValues.productionCompany) {
    nextErrors.productionCompany = 'Ingresa la productora.'
  }

  if (!normalizedValues.locationManager) {
    nextErrors.locationManager = 'Ingresa el jefe de locaciones.'
  }

  if (!normalizedValues.email) {
    nextErrors.email = 'Ingresa un email.'
  } else if (!isValidEmail(normalizedValues.email)) {
    nextErrors.email = 'Ingresa un email valido.'
  }

  return nextErrors
}

function buildSelectionPdfPayload(
  values: SelectionPdfFormValues,
  images: SelectedLocationImage[],
): SelectionPdfPayload {
  const locations = groupImagesByLocation(images)

  return {
    project: {
      product: normalizeValue(values.product),
      productionCompany: normalizeValue(values.productionCompany),
      locationManager: normalizeValue(values.locationManager),
      email: normalizeValue(values.email),
    },
    generatedAt: new Date().toISOString(),
    totalImages: images.length,
    totalLocations: locations.length,
    locations,
  }
}

export function SelectionPdfFlow({
  onBack,
  onClose,
}: SelectionPdfFlowProps) {
  const { images } = useImageSelection()
  const [step, setStep] = useState<SelectionPdfFlowStep>('form')
  const [values, setValues] = useState<SelectionPdfFormValues>(initialValues)
  const [errors, setErrors] = useState<SelectionPdfFormErrors>({})
  const [payload, setPayload] = useState<SelectionPdfPayload | null>(null)
  const [progress, setProgress] = useState<SelectionPdfProgress | null>(null)
  const [exportResult, setExportResult] = useState<SelectionPdfExportResult | null>(null)
  const [failedImages, setFailedImages] = useState<SelectionPdfFailedImage[]>([])
  const [exportError, setExportError] = useState<string | null>(null)

  const totals = useMemo(() => {
    const locationIds = new Set(images.map((image) => image.locationId))

    return {
      totalImages: images.length,
      totalLocations: locationIds.size,
    }
  }, [images])

  function handleFieldChange(
    field: keyof SelectionPdfFormValues,
    value: string,
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }))

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [field]: undefined,
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateForm(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const nextPayload = buildSelectionPdfPayload(values, images)

    setErrors({})
    setExportError(null)
    setExportResult(null)
    setFailedImages([])
    setProgress(null)
    setPayload(nextPayload)
    setStep('preview')
  }

  async function handleDownloadPdf() {
    if (!payload) {
      return
    }

    try {
      setExportError(null)
      setFailedImages([])
      setExportResult(null)
      setStep('generating')

      const {
        createSelectionPdf,
        downloadSelectionPdf,
      } = await import('@/utils/selection-pdf-exporter.ts')

      const result = await createSelectionPdf(payload, {
        onProgress: (nextProgress) => {
          setProgress(nextProgress)
        },
      })

      downloadSelectionPdf(result.blob, result.fileName)
      setExportResult(result)
      setFailedImages(result.failedImages)
      setStep('success')
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'No pudimos generar el PDF.',
      )
      setStep('error')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300">
            Preparacion PDF
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
            {step === 'form'
              ? 'Datos del proyecto'
              : step === 'preview'
                ? 'Preview del PDF'
                : step === 'generating'
                  ? 'Generando PDF'
                  : step === 'success'
                    ? 'PDF generado'
                    : 'No pudimos generar el PDF'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={step === 'generating'}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
          aria-label="Cerrar flujo de preparacion"
        >
          ×
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        {step === 'form' ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
            >
              Volver a la seleccion
            </button>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-brand-300">
                Completa estos datos para dejar listo el payload del PDF.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-brand-100">
                <span className="rounded-full bg-white/6 px-3 py-1.5">
                  {totals.totalLocations} {totals.totalLocations === 1 ? 'locacion' : 'locaciones'}
                </span>
                <span className="rounded-full bg-white/6 px-3 py-1.5">
                  {totals.totalImages} {totals.totalImages === 1 ? 'imagen' : 'imagenes'}
                </span>
              </div>
            </div>

            <SelectionPdfForm
              values={values}
              errors={errors}
              onChange={handleFieldChange}
              onSubmit={handleSubmit}
            />
          </div>
        ) : step === 'preview' && payload ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setStep('form')
                }}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Volver al formulario
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleDownloadPdf()
                }}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Descargar PDF
              </button>
            </div>

            <SelectionPdfPreview payload={payload} />
          </div>
        ) : step === 'generating' ? (
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-brand-300/25 bg-brand-300/10 p-5">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                Generando PDF...
              </h3>
              <p aria-live="polite" className="mt-3 text-sm leading-6 text-brand-300">
                {progress
                  ? `Procesando imagen ${progress.current} de ${progress.total}${progress.locationCode ? ` · ${progress.locationCode}` : ''}`
                  : 'Preparando el documento.'}
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-brand-300 transition-[width]"
                  style={{
                    width: progress
                      ? `${Math.max(8, Math.round((progress.current / progress.total) * 100))}%`
                      : '8%',
                  }}
                />
              </div>
            </div>
          </div>
        ) : step === 'success' ? (
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-brand-300/25 bg-brand-300/10 p-5">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                El PDF se descargo correctamente
              </h3>
              <p className="mt-3 text-sm leading-6 text-brand-300">
                {failedImages.length > 0
                  ? 'El PDF se genero, pero algunas imagenes no pudieron incluirse.'
                  : 'El documento se genero con todas las imagenes disponibles.'}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
              <p className="text-sm text-brand-300">Resumen</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-300">
                    Imagenes incluidas
                  </p>
                  <p className="mt-2 font-display text-3xl text-brand-100">
                    {exportResult?.includedImages ?? 0}
                  </p>
                </div>
                <div className="rounded-[1rem] bg-white/6 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-300">
                    Imagenes omitidas
                  </p>
                  <p className="mt-2 font-display text-3xl text-brand-100">
                    {failedImages.length}
                  </p>
                </div>
              </div>
            </div>

            {failedImages.length > 0 ? (
              <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-200/10 p-4">
                <p className="text-sm font-medium text-amber-100">
                  Algunas imagenes no pudieron incluirse.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-amber-50/90">
                  {failedImages.slice(0, 5).map((failedImage) => (
                    <li key={failedImage.key}>
                      {failedImage.locationCode}: {failedImage.message}
                    </li>
                  ))}
                </ul>
                {failedImages.length > 5 ? (
                  <p className="mt-3 text-sm text-amber-50/80">
                    Y {failedImages.length - 5} imagenes mas.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('preview')
                }}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Volver a la preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('form')
                }}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Editar datos
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-[1.5rem] border border-red-300/30 bg-red-200/10 p-5">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                No pudimos generar el PDF
              </h3>
              <p className="mt-3 text-sm leading-6 text-red-100">
                {exportError ?? 'Ocurrio un problema durante la generacion.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setStep('preview')
                }}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Volver a la preview
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('form')
                }}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Editar datos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'

import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { RequestProjectFavoritesModal } from '@/components/requests/RequestProjectFavoritesModal.tsx'
import { RequestProjectLocationsList } from '@/components/requests/RequestProjectLocationsList.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjectDetail } from '@/hooks/useRequestProjectDetail.ts'
import type { SelectionPdfFormErrors, SelectionPdfFormValues } from '@/types/selection-pdf.ts'
import {
  createSelectionPdf,
  downloadSelectionPdf,
} from '@/utils/selection-pdf-exporter.ts'
import {
  buildRequestProjectMessageFromPdfForm,
  buildSelectionPdfPayloadFromProject,
  mapRequestProjectToPdfFormValues,
  validateSelectionPdfForm,
} from '@/utils/selection-pdf-workspace.ts'

function ProjectWorkspaceDecoration() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 520 360"
      className="h-auto w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="project-decoration-panel" x1="122" y1="66" x2="358" y2="274" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.08" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="project-decoration-clapper" x1="0" y1="0" x2="108" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity="0.12" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      <g opacity="0.72">
        <ellipse cx="270" cy="308" rx="116" ry="18" fill="currentColor" fillOpacity="0.05" />

        <g transform="translate(122 58)">
          <rect
            x="0"
            y="30"
            width="244"
            height="176"
            rx="28"
            fill="url(#project-decoration-panel)"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth="1.6"
          />

          <rect
            x="24"
            y="58"
            width="196"
            height="116"
            rx="24"
            fill="currentColor"
            fillOpacity="0.04"
          />

          <g transform="translate(34 0)">
            <rect
              x="0"
              y="0"
              width="108"
              height="74"
              rx="18"
              fill="url(#project-decoration-clapper)"
            />
            <path d="M20 0L0 26" stroke="currentColor" strokeOpacity="0.16" strokeWidth="8" />
            <path d="M58 0L30 34" stroke="currentColor" strokeOpacity="0.16" strokeWidth="8" />
            <path d="M96 4L66 40" stroke="currentColor" strokeOpacity="0.16" strokeWidth="8" />
          </g>

          <g transform="translate(126 52)">
            <rect
              x="0"
              y="0"
              width="86"
              height="70"
              rx="18"
              fill="currentColor"
              fillOpacity="0.07"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1.4"
            />
            <rect x="15" y="16" width="52" height="10" rx="5" fill="currentColor" fillOpacity="0.12" />
            <rect x="15" y="34" width="40" height="10" rx="5" fill="currentColor" fillOpacity="0.08" />
            <rect x="15" y="52" width="48" height="8" rx="4" fill="currentColor" fillOpacity="0.06" />
          </g>

          <g transform="translate(18 124) rotate(-7 48 34)">
            <rect
              x="0"
              y="0"
              width="96"
              height="68"
              rx="16"
              fill="currentColor"
              fillOpacity="0.06"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1.4"
            />
            <rect x="14" y="14" width="66" height="24" rx="10" fill="currentColor" fillOpacity="0.1" />
            <rect x="14" y="48" width="44" height="8" rx="4" fill="currentColor" fillOpacity="0.06" />
          </g>

          <g transform="translate(166 136) rotate(6 52 36)">
            <rect
              x="0"
              y="0"
              width="104"
              height="72"
              rx="18"
              fill="currentColor"
              fillOpacity="0.05"
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeWidth="1.4"
            />
            <rect x="16" y="14" width="60" height="26" rx="10" fill="currentColor" fillOpacity="0.08" />
            <rect x="16" y="50" width="52" height="8" rx="4" fill="currentColor" fillOpacity="0.06" />
          </g>

          <g transform="translate(188 104)">
            <path
              d="M28 0C12.536 0 0 12.536 0 28C0 48.046 22.293 68.96 26.232 72.49C27.248 73.4 28.752 73.4 29.768 72.49C33.707 68.96 56 48.046 56 28C56 12.536 43.464 0 28 0Z"
              fill="currentColor"
              fillOpacity="0.1"
            />
            <circle cx="28" cy="28" r="9" fill="currentColor" fillOpacity="0.16" />
          </g>
        </g>
      </g>
    </svg>
  )
}

export function RequestDetailPage() {
  const location = useLocation()
  const { id } = useParams()
  const {
    project,
    locations,
    availableFavorites,
    favoriteCount,
    isLoading,
    isLoadingLocations,
    isSaving,
    isSubmitting,
    isMutatingLocations,
    isLoadingAvailableFavorites,
    removingLocationIds,
    error,
    notFound,
    addLocations,
    removeLocation,
    saveProject,
    sendProject,
  } = useRequestProjectDetail(id)
  const [values, setValues] = useState<SelectionPdfFormValues>({
    product: '',
    productionCompany: '',
    locationManager: '',
    email: '',
    tentativeStartDate: '',
    tentativeEndDate: '',
  })
  const [formErrors, setFormErrors] = useState<SelectionPdfFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false)
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)

  usePageTitle(project?.title ?? 'Detalle de proyecto')

  useEffect(() => {
    if (!project) {
      return
    }

    setValues(mapRequestProjectToPdfFormValues(project))
  }, [project])

  useEffect(() => {
    const notice =
      typeof location.state === 'object' &&
      location.state &&
      'notice' in location.state &&
      typeof location.state.notice === 'string'
        ? location.state.notice
        : null

    if (notice) {
      setSuccessMessage(notice)
    }
  }, [location.state])

  useEffect(() => {
    if (!isPdfPreviewOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsPdfPreviewOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPdfPreviewOpen])

  if (notFound) {
    return <Navigate replace to="/404" />
  }

  const isDraft = project?.status === 'draft'
  const pdfPayload =
    project
      ? buildSelectionPdfPayloadFromProject(
          values,
          locations,
          project.updatedAt || project.createdAt,
        )
      : null

  function handleFieldChange(
    field: keyof SelectionPdfFormValues,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))
    setValidationError(null)

    setFormErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [field]: undefined,
      }
    })
  }

  const isPdfPreviewDisabled = !pdfPayload || locations.length === 0
  const isPdfDownloadDisabled = isSaving || isSubmitting || locations.length === 0

  async function handleSubmitProject() {
    if (!project || !isDraft) {
      return
    }

    const nextErrors = validateSelectionPdfForm(values)
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      setValidationError('Revisa los datos del proyecto antes de enviarlo.')
      return
    }

    setFormErrors({})
    setValidationError(null)
    setSuccessMessage(null)

    const nextMessage = buildRequestProjectMessageFromPdfForm(values)
    const nextTentativeStartDate = values.tentativeStartDate || null
    const nextTentativeEndDate = values.tentativeEndDate || null

    if (
      values.product !== project.title ||
      nextMessage !== (project.message ?? '') ||
      nextTentativeStartDate !== project.tentativeStartDate ||
      nextTentativeEndDate !== project.tentativeEndDate
    ) {
      const savedProject = await saveProject({
        title: values.product,
        message: nextMessage,
        tentativeStartDate: nextTentativeStartDate,
        tentativeEndDate: nextTentativeEndDate,
      })

      if (!savedProject) {
        return
      }
    }

    const submittedProject = await sendProject()

    if (submittedProject) {
      setSuccessMessage('Tu proyecto fue enviado correctamente.')
    }
  }

  async function handleDownloadPdf() {
    if (!project || !pdfPayload || locations.length === 0) {
      setValidationError(
        locations.length === 0
          ? 'Agrega al menos una locacion antes de descargar el PDF.'
          : 'No pudimos preparar la propuesta para descargar.',
      )
      return
    }

    const nextErrors = validateSelectionPdfForm(values)

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      setValidationError('Revisa los datos del proyecto antes de descargar el PDF.')
      return
    }

    setFormErrors({})
    setValidationError(null)
    setSuccessMessage(null)

    try {
      const result = await createSelectionPdf(pdfPayload)
      downloadSelectionPdf(result.blob, result.fileName)
      setSuccessMessage('El PDF se descargo correctamente.')
    } catch (downloadError) {
      setValidationError(
        downloadError instanceof Error
          ? downloadError.message
          : 'No pudimos generar el PDF.',
      )
    }
  }

  return (
    <>
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
        <div className="w-full">
          <section className="w-full">
            {isLoading ? (
              <div className="space-y-4">
                <div className="h-8 animate-pulse rounded bg-sand-200" />
                <div className="h-28 animate-pulse rounded-[1.5rem] bg-sand-200" />
                <div className="h-28 animate-pulse rounded-[1.5rem] bg-sand-200" />
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {error}
              </div>
            ) : null}

          {!isLoading && !error && project ? (
            <div className="space-y-10">
                <form
                  className="space-y-10"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleSubmitProject()
                  }}
                >
                  <section className="mx-auto w-full max-w-[1720px] px-4 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-12 2xl:px-14">
                    <div className="rounded-[1.75rem] border border-white/8 bg-[#1B1B1D] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-7 lg:p-8">
                      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                        <div className="space-y-8">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-100 sm:text-4xl">
                              Informacion del proyecto
                            </h2>

                            <div className="flex items-center gap-2">
                              <div className="group relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setValidationError(null)
                                    setSuccessMessage(null)
                                    setIsPdfPreviewOpen(true)
                                  }}
                                  disabled={isPdfPreviewDisabled}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-brand-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D] disabled:cursor-not-allowed disabled:opacity-55"
                                  aria-label="Vista previa"
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                                    <circle cx="12" cy="12" r="2.75" />
                                  </svg>
                                </button>
                                <div className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-20 rounded-full border border-white/10 bg-[#141416] px-3 py-1.5 text-xs font-medium text-brand-100 opacity-0 shadow-[0_14px_30px_rgba(0,0,0,0.28)] transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                                  Vista previa
                                </div>
                              </div>

                              <div className="group relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void handleDownloadPdf()
                                  }}
                                  disabled={isPdfDownloadDisabled}
                                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/6 text-brand-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D] disabled:cursor-not-allowed disabled:opacity-55"
                                  aria-label="Descargar PDF"
                                >
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M12 3.5V14.5" />
                                    <path d="M8 10.5L12 14.5L16 10.5" />
                                    <path d="M4.5 18.5H19.5" />
                                  </svg>
                                </button>
                                <div className="pointer-events-none absolute right-0 top-[calc(100%+0.6rem)] z-20 rounded-full border border-white/10 bg-[#141416] px-3 py-1.5 text-xs font-medium text-brand-100 opacity-0 shadow-[0_14px_30px_rgba(0,0,0,0.28)] transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                                  Descargar PDF
                                </div>
                              </div>
                            </div>
                          </div>

                          {successMessage ? (
                            <div className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                              {successMessage}
                            </div>
                          ) : null}

                          {validationError ? (
                            <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                              {validationError}
                            </div>
                          ) : null}

                          <div className="max-w-[860px]">
                            <SelectionPdfForm
                              values={values}
                              errors={formErrors}
                              onChange={handleFieldChange}
                              disabled={!isDraft || isSaving || isSubmitting}
                              variant="compact"
                              columns={2}
                              showTentativeDates={false}
                            />
                          </div>

                          <div className="space-y-5">
                            <h2 className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100 sm:text-3xl">
                              Fechas tentativas
                            </h2>

                            <div className="max-w-[860px]">
                              <div className="grid gap-4 sm:grid-cols-2">
                              <div className="px-1 py-1">
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-100/45">
                                  Inicio
                                </p>
                                <input
                                  type="date"
                                  value={values.tentativeStartDate}
                                  disabled={!isDraft || isSaving || isSubmitting}
                                  onChange={(event) => {
                                    handleFieldChange(
                                      'tentativeStartDate',
                                      event.target.value,
                                    )
                                  }}
                                  className="mt-3 min-h-11 w-full border border-white/12 bg-white/6 px-3.5 text-sm text-brand-100 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
                                />
                              </div>

                              <div className="px-1 py-1">
                                <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-100/45">
                                  Fin
                                </p>
                                <input
                                  type="date"
                                  value={values.tentativeEndDate}
                                  disabled={!isDraft || isSaving || isSubmitting}
                                  min={values.tentativeStartDate || undefined}
                                  onChange={(event) => {
                                    handleFieldChange(
                                      'tentativeEndDate',
                                      event.target.value,
                                    )
                                  }}
                                  className="mt-3 min-h-11 w-full border border-white/12 bg-white/6 px-3.5 text-sm text-brand-100 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-70"
                                />
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>

                        <div className="pointer-events-none hidden items-center justify-center text-brand-100 xl:flex">
                          <div className="w-full max-w-[22rem]">
                            <ProjectWorkspaceDecoration />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="mx-auto w-full max-w-[1720px] px-4 sm:px-6 lg:px-10 2xl:px-14">
                    <div className="rounded-[1.75rem] border border-white/8 bg-[#1B1B1D] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:p-7 lg:p-8">
                      <div className="space-y-7">
                        <div>
                          <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-100 sm:text-4xl">
                            Locaciones asociadas
                          </h2>
                        </div>

                        <RequestProjectLocationsList
                          locations={locations}
                          isLoading={isLoadingLocations}
                          canRemove={isDraft}
                          removingLocationIds={removingLocationIds}
                          onRemove={(locationId) => {
                            if (isMutatingLocations) {
                              return
                            }

                            void removeLocation(locationId)
                          }}
                        />
                      </div>
                    </div>
                  </section>

                  {isDraft ? (
                    <section className="mx-auto flex w-full max-w-[1720px] justify-center px-4 pb-14 pt-2 sm:px-6 lg:px-10 lg:pb-20 2xl:px-14">
                      <button
                        type="submit"
                        disabled={isSaving || isSubmitting}
                        className="inline-flex min-h-14 min-w-[300px] items-center justify-center rounded-full border border-brand-300/30 bg-brand-300/10 px-10 text-sm font-medium text-brand-100 transition hover:bg-brand-300/15 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? 'Enviando proyecto...' : 'Enviar proyecto'}
                      </button>
                    </section>
                  ) : null}
                </form>
              </div>
            ) : null}
          </section>
        </div>
      </div>
      {isPdfPreviewOpen && pdfPayload ? (
        <div
          className="fixed inset-0 z-[70] bg-black/65 px-4 py-4 sm:px-6 sm:py-6"
          onClick={() => {
            setIsPdfPreviewOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-project-preview-title"
            className="flex h-full items-start justify-center"
          >
            <div
              className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden border border-white/10 bg-[#0f0b09] shadow-[0_28px_80px_rgba(0,0,0,0.4)]"
              onClick={(event) => {
                event.stopPropagation()
              }}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
                <p
                  id="request-project-preview-title"
                  className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-300"
                >
                  Vista previa PDF
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setIsPdfPreviewOpen(false)
                  }}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0b09]"
                  aria-label="Cerrar vista previa PDF"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                <SelectionPdfPreview payload={pdfPayload} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <RequestProjectFavoritesModal
        favorites={availableFavorites}
        favoriteCount={favoriteCount}
        isLoading={isLoadingAvailableFavorites}
        isOpen={isFavoritesModalOpen}
        isSubmitting={isMutatingLocations}
        onClose={() => {
          if (isMutatingLocations) {
            return
          }

          setIsFavoritesModalOpen(false)
        }}
        onSubmit={async (locationIds) => {
          const addedCount = await addLocations(locationIds)

          if (addedCount > 0) {
            setSuccessMessage(
              `${addedCount} locacion${addedCount === 1 ? '' : 'es'} agregada${addedCount === 1 ? '' : 's'} al proyecto.`,
            )
          }

          setIsFavoritesModalOpen(false)
        }}
      />
    </>
  )
}

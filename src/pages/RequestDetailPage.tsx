import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Navigate, useLocation, useParams } from 'react-router-dom'

import {
  DateInputWithVisualShell,
  SelectionPdfForm,
} from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { RequestProjectFavoritesModal } from '@/components/requests/RequestProjectFavoritesModal.tsx'
import { RequestProjectLocationsList } from '@/components/requests/RequestProjectLocationsList.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjectDetail } from '@/hooks/useRequestProjectDetail.ts'
import { syncRequestProjectPdfPayloadSnapshot } from '@/services/request-projects.service.ts'
import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
  SelectionPdfPayload,
} from '@/types/selection-pdf.ts'
import {
  createSelectionPdf,
  downloadSelectionPdf,
} from '@/utils/selection-pdf-exporter.ts'
import {
  buildSelectionPdfPayloadFromProject,
  buildRequestProjectMessageFromPdfForm,
  mapRequestProjectToPdfFormValues,
  validateSelectionPdfForm,
} from '@/utils/selection-pdf-workspace.ts'

function DraftSaveIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.05rem] w-[1.05rem] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 4.75h10.25l2.75 2.75v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4.5 18.5v-12A1.75 1.75 0 0 1 6.25 4.75Z" />
      <path d="M8 4.75v5h7v-5" />
      <path d="M8.25 15.25h7.5" />
    </svg>
  )
}

function SubmitProposalIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.05rem] w-[1.05rem] shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.75 11.75 18.5 5.5 14 19.25l-3.15-4.35-4.1-3.15Z" />
      <path d="m10.6 14.7 2.6-2.6" />
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
  const [pdfPayload, setPdfPayload] = useState<SelectionPdfPayload | null>(null)

  usePageTitle(project?.title ?? 'Detalle de proyecto')

  useEffect(() => {
    if (!project) {
      setPdfPayload(null)
      return
    }

    setValues(mapRequestProjectToPdfFormValues(project))
  }, [project])

  useEffect(() => {
    if (!id || !project) {
      setPdfPayload(null)
      return
    }

    const projectId = id
    let isCancelled = false

    async function loadPdfPayload() {
      try {
        const nextPayload = await buildSelectionPdfPayloadFromProject(projectId)

        if (!isCancelled) {
          setPdfPayload(nextPayload)
        }
      } catch {
        if (!isCancelled) {
          setPdfPayload(null)
        }
      }
    }

    void loadPdfPayload()

    return () => {
      isCancelled = true
    }
  }, [id, project, locations])

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
  const currentProjectMessage = buildRequestProjectMessageFromPdfForm(values)
  const hasUnsavedChanges = useMemo(() => {
    if (!project || !isDraft) {
      return false
    }

    const nextTitle = values.product.trim()
    const nextStartDate = values.tentativeStartDate || null
    const nextEndDate = values.tentativeEndDate || null

    return (
      nextTitle !== project.title ||
      currentProjectMessage !== (project.message ?? '') ||
      nextStartDate !== project.tentativeStartDate ||
      nextEndDate !== project.tentativeEndDate
    )
  }, [
    currentProjectMessage,
    isDraft,
    project,
    values.product,
    values.tentativeEndDate,
    values.tentativeStartDate,
  ])

  async function handleSaveChanges() {
    if (!project || !isDraft || !hasUnsavedChanges) {
      return
    }

    setValidationError(null)
    setSuccessMessage(null)

    const savedProject = await saveProject({
      title: values.product,
      message: currentProjectMessage,
      tentativeStartDate: values.tentativeStartDate || null,
      tentativeEndDate: values.tentativeEndDate || null,
    })

    if (savedProject) {
      setSuccessMessage('Cambios guardados correctamente.')
    }
  }

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

    const nextMessage = currentProjectMessage
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
      await syncRequestProjectPdfPayloadSnapshot(project.id, pdfPayload)
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
                  <section className="mx-auto w-full max-w-[980px] px-0 pt-8 sm:px-6 sm:pt-10 lg:px-10 lg:pt-12">
                    <div className="w-full rounded-none border-x-0 border-y border-white/8 bg-[#1B1B1D] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem] sm:border sm:p-7 lg:p-8">
                      <div className="space-y-8">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                            <h2 className="min-w-0 font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-100 sm:text-4xl">
                              Información del proyecto
                            </h2>

                            <div className="flex shrink-0 items-center justify-end gap-2 self-start">
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
                                <DateInputWithVisualShell
                                  id="project-tentative-start-date"
                                  name="tentativeStartDate"
                                  label="Inicio"
                                  value={values.tentativeStartDate}
                                  error={formErrors.tentativeStartDate}
                                  disabled={!isDraft || isSaving || isSubmitting}
                                  compact
                                  onChange={handleFieldChange}
                                />

                                <DateInputWithVisualShell
                                  id="project-tentative-end-date"
                                  name="tentativeEndDate"
                                  label="Fin"
                                  value={values.tentativeEndDate}
                                  error={formErrors.tentativeEndDate}
                                  disabled={!isDraft || isSaving || isSubmitting}
                                  min={values.tentativeStartDate || undefined}
                                  compact
                                  onChange={handleFieldChange}
                                />
                              </div>
                            </div>
                          </div>
                      </div>
                    </div>
                  </section>

                  <section className="mx-auto w-full max-w-[1720px] px-0 sm:px-6 lg:px-10 2xl:px-14">
                    <div className="w-full rounded-none border-x-0 border-y border-white/8 bg-[#1B1B1D] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:rounded-[1.75rem] sm:border sm:p-7 lg:p-8">
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
                      <div className="flex w-full max-w-[980px] flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => {
                            void handleSaveChanges()
                          }}
                          disabled={isSaving || isSubmitting || !hasUnsavedChanges}
                          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                        >
                          <DraftSaveIcon />
                          {isSaving ? 'Guardando cambios...' : 'Guardar cambios'}
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving || isSubmitting}
                          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                        >
                          <SubmitProposalIcon />
                          {isSubmitting ? 'Enviando proyecto...' : 'Enviar proyecto'}
                        </button>
                      </div>
                    </section>
                  ) : null}
                </form>
              </div>
            ) : null}
          </section>
        </div>
      </div>
      {isPdfPreviewOpen && pdfPayload
        ? createPortal(
        <div
          className="fixed inset-0 z-[70] bg-black/65 px-0 py-4 sm:px-6 sm:py-6"
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
              className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden border-x-0 border-y border-white/10 bg-[#0f0b09] shadow-[0_28px_80px_rgba(0,0,0,0.4)] sm:border"
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
        ,
        document.body,
      )
        : null}
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

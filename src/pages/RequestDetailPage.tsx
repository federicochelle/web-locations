import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'

import { ProposalWorkspace } from '@/components/selection/ProposalWorkspace.tsx'
import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { RequestProjectFavoritesModal } from '@/components/requests/RequestProjectFavoritesModal.tsx'
import { AppModal } from '@/components/ui/AppModal.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjectDetail } from '@/hooks/useRequestProjectDetail.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'
import {
  submitRequestProjectWithOfficialPdf,
} from '@/services/request-projects.service.ts'
import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
} from '@/types/selection-pdf.ts'
import { downloadSelectionPdf } from '@/utils/selection-pdf-exporter.ts'
import {
  createRequestProjectFormSnapshot,
  normalizeRequestProjectFormValues,
  normalizeRequestProjectSnapshotFromProject,
  type NormalizedRequestProjectFormValues,
} from '@/utils/request-project-form-autosave.ts'
import {
  buildSelectionPdfPayloadFromProject,
  mapRequestProjectToPdfFormValues,
  validateSelectionPdfForm,
} from '@/utils/selection-pdf-workspace.ts'

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

function EditProjectIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" />
    </svg>
  )
}

function EditProjectNoticeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function AutosaveSpinnerIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 animate-spin"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  )
}

function AutosaveCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 12 5 5L20 7" />
    </svg>
  )
}

function AutosaveErrorIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  )
}

function formatReadOnlyValue(value: string | null) {
  const trimmedValue = value?.trim() ?? ''
  return trimmedValue.length > 0 ? trimmedValue : '—'
}

type DraftAutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type DraftAutosaveIndicatorState = 'hidden' | 'saving' | 'saved' | 'error'

export function RequestDetailPage() {
  const location = useLocation()
  const { id } = useParams()
  const {
    activeEditingProjectId,
    beginProjectEditing,
    finishProjectEditing,
    flushAndFinishProjectEditing,
    refreshProjects,
    registerProjectEditingExitHandler,
  } = useRequestProjects()
  const {
    project,
    locations,
    availableFavorites,
    favoriteCount,
    isLoading,
    isSaving,
    isMutatingLocations,
    isLoadingAvailableFavorites,
    error,
    notFound,
    addLocations,
    refreshProject,
    saveProject,
  } = useRequestProjectDetail(id)
  const [values, setValues] = useState<SelectionPdfFormValues>({
    product: '',
    productionCompany: '',
    tentativeStartDate: '',
    tentativeEndDate: '',
    message: '',
  })
  const [formErrors, setFormErrors] = useState<SelectionPdfFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false)
  const [isEditNoticeModalOpen, setIsEditNoticeModalOpen] = useState(false)
  const [isExitEditModalOpen, setIsExitEditModalOpen] = useState(false)
  const [isSubmittingOfficial, setIsSubmittingOfficial] = useState(false)
  const [persistedDraftSnapshot, setPersistedDraftSnapshot] = useState<string | null>(null)
  const [, setDraftAutosaveStatus] = useState<DraftAutosaveStatus>('idle')
  const [draftAutosaveIndicator, setDraftAutosaveIndicator] = useState<DraftAutosaveIndicatorState>('hidden')
  const autosaveTimeoutRef = useRef<number | null>(null)
  const autosavePromiseRef = useRef<Promise<boolean> | null>(null)
  const autosaveExecutionTokenRef = useRef<symbol | null>(null)
  const autosaveRequestVersionRef = useRef(0)
  const autosaveSuccessTimeoutRef = useRef<number | null>(null)
  const lastQueuedDraftSnapshotRef = useRef<string | null>(null)
  const persistedDraftSnapshotRef = useRef<string | null>(null)
  const latestDraftSnapshotRef = useRef<string | null>(null)
  const latestDraftValuesRef = useRef<NormalizedRequestProjectFormValues | null>(null)
  const hydratedProjectIdRef = useRef<string | null>(null)
  const autosaveEnabledRef = useRef(false)

  usePageTitle(project?.title ?? 'Detalle de proyecto')

  useEffect(() => {
    if (!project) {
      return
    }

    const normalizedProjectValues = normalizeRequestProjectSnapshotFromProject(project)
    const nextPersistedSnapshot = createRequestProjectFormSnapshot(normalizedProjectValues)
    persistedDraftSnapshotRef.current = nextPersistedSnapshot
    setPersistedDraftSnapshot(nextPersistedSnapshot)

    if (hydratedProjectIdRef.current === project.id) {
      if (project.status === 'draft' && latestDraftSnapshotRef.current === nextPersistedSnapshot) {
        setDraftAutosaveStatus('saved')
      }
      return
    }

    hydratedProjectIdRef.current = project.id
    lastQueuedDraftSnapshotRef.current = nextPersistedSnapshot
    setValues(mapRequestProjectToPdfFormValues(project))
    setFormErrors({})
    setValidationError(null)
    setDraftAutosaveStatus(project.status === 'draft' ? 'saved' : 'idle')
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

  const isDraft = project?.status === 'draft'
  const isSentProject = Boolean(project && project.status !== 'draft')
  const isEditableProject = project ? project.status !== 'closed' : false
  const isEditingProject = Boolean(
    project &&
      project.status !== 'draft' &&
      activeEditingProjectId === project.id,
  )
  const isFormEditable = isEditableProject && (!isSentProject || isEditingProject)
  const isAutosaveEnabled = Boolean(
    project &&
      isEditableProject &&
      (isDraft || (isSentProject && isEditingProject)),
  )

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

  const normalizedDraftValues = useMemo(
    () => normalizeRequestProjectFormValues(values),
    [values],
  )
  const currentDraftSnapshot = useMemo(
    () => createRequestProjectFormSnapshot(normalizedDraftValues),
    [normalizedDraftValues],
  )

  useEffect(() => {
    latestDraftValuesRef.current = normalizedDraftValues
    latestDraftSnapshotRef.current = currentDraftSnapshot
  }, [currentDraftSnapshot, normalizedDraftValues])

  useEffect(() => {
    autosaveEnabledRef.current = isAutosaveEnabled
  }, [isAutosaveEnabled])

  const currentPdfPayload = useMemo(
    () => buildSelectionPdfPayloadFromProject(values, locations, new Date().toISOString()),
    [locations, values],
  )
  const isSubmitting = isSubmittingOfficial
  const hasUnsavedChanges = useMemo(() => {
    if (!project || persistedDraftSnapshot === null) {
      return false
    }

    return currentDraftSnapshot !== persistedDraftSnapshot
  }, [currentDraftSnapshot, persistedDraftSnapshot, project])
  const canSubmitCurrentProject = Boolean(
    project &&
      (isDraft || project.hasUnsubmittedChanges || hasUnsavedChanges),
  )

  useEffect(() => {
    if (
      !project ||
      !isAutosaveEnabled ||
      hydratedProjectIdRef.current !== project.id
    ) {
      return
    }

    if (currentDraftSnapshot === persistedDraftSnapshotRef.current) {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }

      if (!autosavePromiseRef.current) {
        setDraftAutosaveStatus('saved')
      }
      return
    }

    lastQueuedDraftSnapshotRef.current = currentDraftSnapshot
    setDraftAutosaveStatus('saving')

    if (autosavePromiseRef.current) {
      return
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
    }

    const requestVersion = autosaveRequestVersionRef.current + 1
    autosaveRequestVersionRef.current = requestVersion
    const snapshotAtSchedule = currentDraftSnapshot
    const valuesAtSchedule = normalizedDraftValues
    const projectIdAtSchedule = project.id

    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null

      if (
        hydratedProjectIdRef.current !== projectIdAtSchedule ||
        autosaveRequestVersionRef.current !== requestVersion ||
        persistedDraftSnapshotRef.current === snapshotAtSchedule
      ) {
        return
      }

      void runDraftAutosave(snapshotAtSchedule, valuesAtSchedule, requestVersion)
    }, 800)
  }, [
    currentDraftSnapshot,
    isAutosaveEnabled,
    normalizedDraftValues,
    project,
  ])

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }

      if (autosaveSuccessTimeoutRef.current !== null) {
        window.clearTimeout(autosaveSuccessTimeoutRef.current)
        autosaveSuccessTimeoutRef.current = null
      }
    }
  }, [])

  if (notFound) {
    return <Navigate replace to="/404" />
  }

  function openSentProjectEditing() {
    if (!project) {
      return
    }

    setValidationError(null)
    setSuccessMessage(null)
    setFormErrors({})
    setValues(mapRequestProjectToPdfFormValues(project))
    beginProjectEditing(project.id)
  }

  async function runDraftAutosave(
    snapshot: string,
    nextValues: NormalizedRequestProjectFormValues,
    requestVersion: number,
  ) {
    if (!project || !autosaveEnabledRef.current) {
      return true
    }

    const autosaveExecutionToken = Symbol('draft-autosave')
    const autosavePromise = (async () => {
      try {
        if (autosaveSuccessTimeoutRef.current !== null) {
          window.clearTimeout(autosaveSuccessTimeoutRef.current)
          autosaveSuccessTimeoutRef.current = null
        }

        setDraftAutosaveIndicator('saving')
        const savedProject = await saveProject(
          {
            title: nextValues.title,
            productionCompany: nextValues.productionCompany,
            message: nextValues.message,
            tentativeStartDate: nextValues.tentativeStartDate,
            tentativeEndDate: nextValues.tentativeEndDate,
          },
          {
            suppressErrorState: true,
          },
        )

        if (!savedProject) {
          if (autosaveRequestVersionRef.current === requestVersion) {
            setDraftAutosaveStatus('error')
            setDraftAutosaveIndicator('error')
          }
          return false
        }

        persistedDraftSnapshotRef.current = snapshot
        setPersistedDraftSnapshot(snapshot)

        if (
          autosaveRequestVersionRef.current === requestVersion &&
          latestDraftSnapshotRef.current === snapshot
        ) {
          setDraftAutosaveStatus('saved')
          setDraftAutosaveIndicator('saved')
          autosaveSuccessTimeoutRef.current = window.setTimeout(() => {
            autosaveSuccessTimeoutRef.current = null
            setDraftAutosaveIndicator((current) =>
              current === 'saved' ? 'hidden' : current,
            )
          }, 1800)
        }

        return true
      } finally {
        if (autosaveExecutionTokenRef.current === autosaveExecutionToken) {
          autosaveExecutionTokenRef.current = null
          autosavePromiseRef.current = null
        }

        const latestSnapshot = latestDraftSnapshotRef.current
        const latestValues = latestDraftValuesRef.current

        if (
          autosaveEnabledRef.current &&
          latestSnapshot &&
          latestValues &&
          latestSnapshot !== persistedDraftSnapshotRef.current
        ) {
          const nextRequestVersion = autosaveRequestVersionRef.current + 1
          autosaveRequestVersionRef.current = nextRequestVersion
          setDraftAutosaveStatus('saving')
          void runDraftAutosave(latestSnapshot, latestValues, nextRequestVersion)
        }
      }
    })()

    autosaveExecutionTokenRef.current = autosaveExecutionToken
    autosavePromiseRef.current = autosavePromise
    return autosavePromise
  }

  async function flushDraftAutosave() {
    if (!project || !autosaveEnabledRef.current) {
      return true
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    if (autosavePromiseRef.current) {
      await autosavePromiseRef.current
    }

    const latestSnapshot = latestDraftSnapshotRef.current
    const latestValues = latestDraftValuesRef.current

    if (
      latestSnapshot &&
      latestValues &&
      latestSnapshot !== persistedDraftSnapshotRef.current
    ) {
      const requestVersion = autosaveRequestVersionRef.current + 1
      autosaveRequestVersionRef.current = requestVersion
      setDraftAutosaveStatus('saving')
      return runDraftAutosave(latestSnapshot, latestValues, requestVersion)
    }

    return true
  }

  async function flushPendingProjectChanges() {
    const didFlushDraftAutosave = await flushDraftAutosave()

    if (!didFlushDraftAutosave) {
      return false
    }

    if (currentDraftSnapshot !== persistedDraftSnapshotRef.current) {
      const savedProject = await saveProject({
        title: normalizedDraftValues.title,
        productionCompany: normalizedDraftValues.productionCompany,
        message: normalizedDraftValues.message,
        tentativeStartDate: normalizedDraftValues.tentativeStartDate,
        tentativeEndDate: normalizedDraftValues.tentativeEndDate,
      })

      if (!savedProject) {
        return false
      }
    }

    return true
  }

  useEffect(() => {
    if (!project || !isSentProject || !isEditingProject) {
      return
    }

    return registerProjectEditingExitHandler(project.id, flushPendingProjectChanges)
  }, [
    flushPendingProjectChanges,
    isEditingProject,
    isSentProject,
    project,
    registerProjectEditingExitHandler,
  ])

  function handleCancelEditing() {
    if (!project || !isSentProject) {
      return
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    if (autosaveSuccessTimeoutRef.current !== null) {
      window.clearTimeout(autosaveSuccessTimeoutRef.current)
      autosaveSuccessTimeoutRef.current = null
    }

    const normalizedProjectValues = normalizeRequestProjectSnapshotFromProject(project)
    const nextPersistedSnapshot = createRequestProjectFormSnapshot(normalizedProjectValues)
    latestDraftValuesRef.current = normalizedProjectValues
    latestDraftSnapshotRef.current = nextPersistedSnapshot
    lastQueuedDraftSnapshotRef.current = nextPersistedSnapshot
    setDraftAutosaveIndicator('hidden')
    setDraftAutosaveStatus('idle')
    setIsExitEditModalOpen(true)
  }

  async function handleSubmitProject() {
    if (!project || !isEditableProject) {
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

    const didFlushPendingProjectChanges = await flushPendingProjectChanges()

    if (!didFlushPendingProjectChanges) {
      setValidationError('No se pudieron guardar los cambios pendientes antes de enviar el proyecto.')
      return
    }

    if (locations.length === 0) {
      setValidationError('Agrega al menos una locacion antes de enviar el proyecto.')
      return
    }

    setIsSubmittingOfficial(true)

    try {
      const submissionResult = await submitRequestProjectWithOfficialPdf({
        projectId: project.id,
        payload: currentPdfPayload,
      })

      downloadSelectionPdf(
        submissionResult.exportResult.blob,
        submissionResult.exportResult.fileName,
      )
      await refreshProject()
      await refreshProjects()
      if (!isDraft) {
        finishProjectEditing(project.id)
      }
      setSuccessMessage(
        isDraft
          ? 'Tu proyecto fue enviado correctamente.'
          : 'La nueva versión del proyecto se envió correctamente.',
      )
    } catch (submitError) {
      setValidationError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos enviar el proyecto.',
      )
    } finally {
      setIsSubmittingOfficial(false)
    }
  }

  function renderReadOnlyProjectDetails() {
    if (!project) {
      return null
    }

    const primaryFields = [
      {
        label: 'Producto',
        value: formatReadOnlyValue(project.title),
      },
      {
        label: 'Productora',
        value: formatReadOnlyValue(project.productionCompany),
      },
      {
        label: 'Fecha desde',
        value: formatReadOnlyValue(project.tentativeStartDate),
      },
      {
        label: 'Fecha hasta',
        value: formatReadOnlyValue(project.tentativeEndDate),
      },
    ] as const

    const messageValue = formatReadOnlyValue(project.message)

    return (
      <div className="space-y-8">
        <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
          {primaryFields.map((field) => (
            <div key={field.label}>
              <p className="mb-3 block text-sm font-medium text-brand-100">
                {field.label}
              </p>
              <p className="text-[0.98rem] font-medium leading-6 text-brand-100">
                {field.value}
              </p>
            </div>
          ))}
        </div>

        <div>
          <p className="mb-3 block text-sm font-medium text-brand-100">
            Mensaje
          </p>
          <p className="whitespace-pre-wrap text-[0.98rem] font-medium leading-7 text-brand-100">
            {messageValue}
          </p>
        </div>

      </div>
    )
  }

  function renderProjectSidebarBody() {
    return (
      <div className="flex min-h-full flex-col">
        <div className="space-y-6">
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

          {isSentProject && !isEditingProject
            ? renderReadOnlyProjectDetails()
            : (
              <SelectionPdfForm
                values={values}
                errors={formErrors}
                onChange={handleFieldChange}
                disabled={!isFormEditable || isSubmitting}
                variant="compact"
                columns={2}
                showTentativeDates
              />
            )}
        </div>
      </div>
    )
  }

  function renderProjectSidebarFooter() {
    if (!isEditableProject) {
      return null
    }

    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isSaving || isSubmitting || !canSubmitCurrentProject}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/60 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_32px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-14px_32px_rgba(0,0,0,0.18),0_14px_28px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
        >
          <SubmitProposalIcon />
          {isSubmitting
            ? isDraft
              ? 'Enviando proyecto...'
              : 'Enviando nueva version...'
            : isDraft
              ? 'Enviar proyecto'
              : 'Enviar nueva version'}
        </button>
      </div>
    )
  }

  function renderProjectDetailWorkspace() {
    return (
      <section className="relative left-1/2 w-screen -translate-x-1/2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmitProject()
          }}
        >
          <ProposalWorkspace
            preview={<SelectionPdfPreview payload={currentPdfPayload} hideCover />}
            sidebarTitle={isDraft ? 'Detalle del borrador' : 'Detalle del proyecto'}
            rootClassName="lg:items-stretch"
            previewSectionClassName="px-0 py-0 sm:px-0 lg:h-[100dvh] lg:self-stretch lg:overflow-y-auto lg:px-0 lg:py-0"
            previewInnerClassName="max-w-none"
            sidebarClassName="lg:border-l lg:border-white/10"
            sidebarBodyInnerClassName="h-full"
            sidebarHeader={(
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <h2 className="min-w-0 font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                    {isDraft ? 'Detalle del borrador' : 'Detalle del proyecto'}
                  </h2>
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center"
                  >
                    {isAutosaveEnabled && draftAutosaveIndicator === 'saving' ? (
                      <span className="text-brand-300">
                        <AutosaveSpinnerIcon />
                      </span>
                    ) : null}
                    {isAutosaveEnabled && draftAutosaveIndicator === 'saved' ? (
                      <span className="text-emerald-300">
                        <AutosaveCheckIcon />
                      </span>
                    ) : null}
                    {isAutosaveEnabled && draftAutosaveIndicator === 'error' ? (
                      <span className="text-red-300">
                        <AutosaveErrorIcon />
                      </span>
                    ) : null}
                  </span>
                </div>
                {isSentProject && !isEditingProject && isEditableProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditNoticeModalOpen(true)
                    }}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2.5 rounded-full border border-white/14 bg-white/8 px-4.5 text-sm font-semibold text-brand-100 transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                  >
                    <EditProjectIcon />
                    Editar
                  </button>
                ) : null}
                {isSentProject && isEditingProject ? (
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={isSaving || isSubmitting}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/14 bg-white/8 text-brand-100 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                    aria-label="Cancelar edicion"
                  >
                    <span className="text-lg leading-none">×</span>
                  </button>
                ) : null}
              </div>
            )}
            sidebarBody={renderProjectSidebarBody()}
            sidebarFooter={renderProjectSidebarFooter()}
          />
        </form>
      </section>
    )
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

          {!isLoading && !error && project ? renderProjectDetailWorkspace() : null}
          </section>
        </div>
      </div>
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
            await refreshProjects()
            setSuccessMessage(
              `${addedCount} locacion${addedCount === 1 ? '' : 'es'} agregada${addedCount === 1 ? '' : 's'} al proyecto.`,
            )
          }

          setIsFavoritesModalOpen(false)
        }}
      />
      <AppModal
        open={isEditNoticeModalOpen}
        onClose={() => {
          setIsEditNoticeModalOpen(false)
        }}
        panelClassName="max-w-md"
      >
        <div className="p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/6 text-brand-300">
              <EditProjectNoticeIcon />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                Editar proyecto enviado
              </h3>
              <p className="mt-3 text-sm leading-6 text-brand-100/78">
                Si realizas cambios, recorda enviar nuevamente el proyecto para actualizar la version.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setIsEditNoticeModalOpen(false)
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 bg-white/8 px-4.5 text-sm font-medium text-brand-100 transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditNoticeModalOpen(false)
                openSentProjectEditing()
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-300 px-4.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Continuar
            </button>
          </div>
        </div>
      </AppModal>
      <AppModal
        open={isExitEditModalOpen}
        onClose={() => {
          setIsExitEditModalOpen(false)
        }}
        panelClassName="max-w-md"
      >
        <div className="p-6 sm:p-7">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
              Salir de la edición
            </h3>
            <p className="mt-3 text-sm leading-6 text-brand-100/78">
              Estás editando una nueva versión de este proyecto. ¿Querés salir?
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setIsExitEditModalOpen(false)
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 bg-white/8 px-4.5 text-sm font-medium text-brand-100 transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!project) {
                  setIsExitEditModalOpen(false)
                  return
                }

                const didExitEditing = await flushAndFinishProjectEditing(project.id)

                if (!didExitEditing) {
                  return
                }

                setValues(mapRequestProjectToPdfFormValues(project))
                setFormErrors({})
                setValidationError(null)
                setSuccessMessage(null)
                setIsExitEditModalOpen(false)
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-300 px-4.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Salir
            </button>
          </div>
        </div>
      </AppModal>
    </>
  )
}

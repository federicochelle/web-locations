import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import drawerFooterBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (3).webp'
import drawerHeaderBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.40 PM.webp'
import { RequestProjectStatusBadge } from '@/components/requests/RequestProjectStatusBadge.tsx'
import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { SubmissionLoadingModal } from '@/components/submissions/SubmissionLoadingModal.tsx'
import { SubmissionResultModal } from '@/components/submissions/SubmissionResultModal.tsx'
import { ImageLightbox } from '@/components/ui/ImageLightbox.tsx'
import { RequestProjectFavoritesModal } from '@/components/requests/RequestProjectFavoritesModal.tsx'
import { AppModal } from '@/components/ui/AppModal.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { usePageSeo } from '@/hooks/usePageSeo.ts'
import { useProductionCompanyLogo } from '@/hooks/useProductionCompanyLogoUrl.ts'
import { useRequestProjectDetail } from '@/hooks/useRequestProjectDetail.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'
import {
  downloadOfficialRequestProjectPdf,
  submitRequestProjectWithOfficialPdf,
} from '@/services/request-projects.service.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import type { RequestProjectLocation } from '@/types/request-project.ts'
import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
  SelectionPdfProgress,
} from '@/types/selection-pdf.ts'
import { getImageSelectionKey } from '@/utils/image-selection-key.ts'
import {
  downloadSelectionPdf,
} from '@/utils/selection-pdf-exporter.ts'
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
import { buildPublicLocationPath } from '@/utils/location-public.ts'
import { buildWhatsAppUrl } from '@/utils/whatsapp.ts'

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
      className="h-[1.7rem] w-[1.7rem] shrink-0 sm:h-3.5 sm:w-3.5"
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

function DownloadPdfIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[1.7rem] w-[1.7rem] shrink-0 sm:h-3.5 sm:w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4.5v10" />
      <path d="m8.5 11.5 3.5 3.5 3.5-3.5" />
      <path d="M5 18.5h14" />
    </svg>
  )
}

function AddLocationsIcon() {
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
      <path d="M12 5.5v13" />
      <path d="M5.5 12h13" />
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

function CancelEditIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

function RemoveSelectedImageIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4.5 w-4.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.25 4.75h5.5" />
      <path d="M5.75 7.25h12.5" />
      <path d="m8.25 7.25.7 10.1a1.75 1.75 0 0 0 1.75 1.65h2.6a1.75 1.75 0 0 0 1.75-1.65l.7-10.1" />
      <path d="M10 10.25v5.5" />
      <path d="M14 10.25v5.5" />
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

function OpenLocationIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  )
}

type DraftAutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type DraftAutosaveIndicatorState = 'hidden' | 'saving' | 'saved' | 'error'

const drawerPanelOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const drawerPanelHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

const drawerSecondaryButtonClassName =
  'inline-flex min-h-10 items-center justify-center rounded-full border border-white/14 bg-white/8 px-3.5 text-sm font-medium text-brand-100 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-12px_24px_rgba(0,0,0,0.18),0_10px_22px_rgba(0,0,0,0.14)] transition hover:bg-white/12 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-12px_24px_rgba(0,0,0,0.16),0_12px_24px_rgba(0,0,0,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]'

const drawerPrimaryButtonClassName =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-white/10 px-4.5 text-sm font-medium text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_32px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-14px_32px_rgba(0,0,0,0.18),0_14px_28px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]'

function getProgressStatusMessage(progress: SelectionPdfProgress | null) {
  if (!progress) {
    return 'Guardando proyecto y preparando el documento.'
  }

  switch (progress.stage) {
    case 'saving-project':
      return 'Guardando proyecto'
    case 'preparing-images':
      return `Preparando imagenes ${progress.current ?? 0} de ${progress.total ?? 0}${progress.locationCode ? ` · ${progress.locationCode}` : ''}`
    case 'building-pdf':
      return 'Armando PDF'
    case 'uploading-pdf':
      return 'Subiendo PDF'
    case 'finalizing-project':
      return 'Finalizando proyecto'
    case 'completed':
      return 'Proceso completado'
    default:
      return 'Preparando el documento.'
  }
}

type SubmissionKind = 'initial' | 'revision'

export function RequestDetailPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const { role } = useAuth()
  const {
    getProjectSelection,
    hasProjectSelection,
    replaceSelection,
    setActiveProjectContext,
  } = useImageSelection()
  const {
    activeEditingProjectId,
    beginProjectEditing,
    finishProjectEditing,
    flushAndFinishProjectEditing,
    refreshProjects,
    replaceProject,
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
    hasPendingLocationChanges,
    addLocations,
    removeSelectedImage,
    refreshProject,
    saveProject,
  } = useRequestProjectDetail(id)
  const [values, setValues] = useState<SelectionPdfFormValues>({
    product: '',
    productionCompany: '',
    productionCompanyId: null,
    tentativeStartDate: '',
    tentativeEndDate: '',
    message: '',
  })
  const [formErrors, setFormErrors] = useState<SelectionPdfFormErrors>({})
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false)
  const [isEditNoticeModalOpen, setIsEditNoticeModalOpen] = useState(false)
  const [isExitEditModalOpen, setIsExitEditModalOpen] = useState(false)
  const [isSubmittingOfficial, setIsSubmittingOfficial] = useState(false)
  const [submissionProgress, setSubmissionProgress] = useState<SelectionPdfProgress | null>(null)
  const [lastSubmissionKind, setLastSubmissionKind] = useState<SubmissionKind | null>(null)
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false)
  const [activeLightboxLocationId, setActiveLightboxLocationId] = useState<string | null>(null)
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(0)
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

  usePageSeo({
    title: project?.title ?? 'Detalle de proyecto',
    description: 'Detalle privado de proyecto en Film Locations Uruguay.',
    canonicalPath: id ? `/requests/${id}` : '/requests',
    robots: 'noindex,nofollow',
  })

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
      setIsSuccessModalOpen(true)
    }
  }, [location.state])

  const isDraft = project?.status === 'draft'
  const isConfirmedProject = project?.status === 'confirmed'
  const isSentProject = Boolean(project && project.status !== 'draft')
  const isEditableProject = project
    ? project.status !== 'closed' && project.status !== 'confirmed'
    : false
  const isEditingProject = Boolean(
    project &&
      project.status !== 'draft' &&
      project.status !== 'confirmed' &&
      activeEditingProjectId === project.id,
  )
  const isFormEditable = isEditableProject && (!isSentProject || isEditingProject)
  const isAutosaveEnabled = Boolean(
    project &&
      isEditableProject &&
      (isDraft || (isSentProject && isEditingProject)),
  )
  const canAddLocations = Boolean(
    project &&
      isEditableProject &&
      (!isSentProject || isEditingProject),
  )
  const canEditLocationImages = Boolean(
    project &&
      (isDraft || (isSentProject && isEditingProject)),
  )
  const readOnlyProjectFields = useMemo<Array<keyof SelectionPdfFormValues>>(() => {
    if (!isSentProject) {
      return []
    }

    if (!isEditingProject) {
      return [
        'product',
        'productionCompany',
        'tentativeStartDate',
        'tentativeEndDate',
        'message',
      ]
    }

    return ['product', 'productionCompany']
  }, [isEditingProject, isSentProject])

  function handleFieldChange(
    field: keyof SelectionPdfFormValues,
    value: string | null,
  ) {
    setValues((current) => ({
      ...current,
      [field]:
        field === 'productionCompanyId'
          ? value
          : value ?? '',
      ...(field === 'productionCompany' &&
      current.productionCompanyId &&
      value !== current.productionCompany
        ? { productionCompanyId: null }
        : {}),
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

  useEffect(() => {
    if (!project || project.status !== 'confirmed') {
      return
    }

    if (activeEditingProjectId === project.id) {
      finishProjectEditing(project.id)
    }
  }, [activeEditingProjectId, finishProjectEditing, project])
  const {
    logoUrl: productionCompanyLogoUrl,
  } = useProductionCompanyLogo(
    values.productionCompanyId,
  )

  const currentPdfPayload = useMemo(
    () => {
      const generatedAt = new Date().toISOString()
      const basePayload = buildSelectionPdfPayloadFromProject(
        values,
        locations,
        generatedAt,
      )

      return {
        ...basePayload,
        project: {
          ...basePayload.project,
          productionCompanyLogoUrl,
        },
      }
    },
    [locations, productionCompanyLogoUrl, values],
  )
  const isMobileCompletionFlow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  const isSubmitting = isSubmittingOfficial
  const hasUnsavedChanges = useMemo(() => {
    if (!project || persistedDraftSnapshot === null) {
      return false
    }

    return currentDraftSnapshot !== persistedDraftSnapshot
  }, [currentDraftSnapshot, persistedDraftSnapshot, project])
  const canSubmitCurrentProject = Boolean(
    project &&
      (
        isDraft ||
        project.hasUnsubmittedChanges ||
        hasUnsavedChanges ||
        hasPendingLocationChanges
      ),
  )
  const activeLightboxLocation =
    activeLightboxLocationId
      ? locations.find((location) => location.location.id === activeLightboxLocationId) ?? null
      : null

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

  function openSentProjectEditing() {
    if (!project || project.status === 'confirmed') {
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
            productionCompanyId: nextValues.productionCompanyId,
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

        replaceProject(savedProject)
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
        productionCompanyId: normalizedDraftValues.productionCompanyId,
        message: normalizedDraftValues.message,
        tentativeStartDate: normalizedDraftValues.tentativeStartDate,
        tentativeEndDate: normalizedDraftValues.tentativeEndDate,
      })

      if (!savedProject) {
        return false
      }

      replaceProject(savedProject)
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
    if (!project || !isEditableProject || isConfirmedProject) {
      return
    }

    const nextErrors = validateSelectionPdfForm(values)
    if (role !== 'admin' && nextErrors.productionCompany) {
      nextErrors.productionCompany = 'Completa la Productora en Mi cuenta antes de enviar el proyecto.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors)
      setValidationError('Revisa los datos del proyecto antes de enviarlo.')
      return
    }

    setFormErrors({})
    setValidationError(null)
    setSuccessMessage(null)
    setIsSuccessModalOpen(false)
    setSubmissionProgress(null)

    const didFlushPendingProjectChanges = await flushPendingProjectChanges()

    if (!didFlushPendingProjectChanges) {
      setValidationError('No se pudieron guardar los cambios pendientes antes de enviar el proyecto.')
      return
    }

    if (locations.length === 0) {
      setValidationError('Agrega al menos una locacion antes de enviar el proyecto.')
      return
    }

    const submissionKind: SubmissionKind = isDraft ? 'initial' : 'revision'

    setIsSubmittingOfficial(true)
    setLastSubmissionKind(submissionKind)
    setIsLoadingModalOpen(true)
    setSubmissionProgress({
      stage: 'saving-project',
      percent: 0,
    })

    try {
      const submissionResult = await submitRequestProjectWithOfficialPdf({
        projectId: project.id,
        payload: currentPdfPayload,
        onProgress: (nextProgress) => {
          setSubmissionProgress(nextProgress)
        },
      })

      await refreshProject()
      await refreshProjects()
      if (!isDraft) {
        finishProjectEditing(project.id)
      }
      setSubmissionProgress({
        stage: 'completed',
        percent: 100,
        current: submissionResult.exportResult.totalImages,
        total: submissionResult.exportResult.totalImages,
      })
      setIsLoadingModalOpen(false)
      setSuccessMessage(
        submissionKind === 'initial'
          ? 'Tu proyecto fue enviado correctamente.'
          : 'La nueva versión del proyecto se envió correctamente.',
      )
      setIsSuccessModalOpen(true)

      if (!isMobileCompletionFlow) {
        downloadSelectionPdf(
          submissionResult.exportResult.blob,
          submissionResult.exportResult.fileName,
        )
      }
    } catch (submitError) {
      setIsLoadingModalOpen(false)
      setValidationError(
        submitError instanceof Error
          ? submitError.message
          : 'No pudimos enviar el proyecto.',
      )
    } finally {
      setIsSubmittingOfficial(false)
      setSubmissionProgress(null)
    }
  }

  async function handleDownloadOfficialPdf() {
    if (!project?.officialPdf) {
      return
    }

    try {
      const downloadResult = await downloadOfficialRequestProjectPdf(project)
      downloadSelectionPdf(downloadResult.blob, downloadResult.fileName)
    } catch (downloadError) {
      setValidationError(
        downloadError instanceof Error
          ? downloadError.message
          : 'No pudimos descargar el PDF oficial.',
      )
    }
  }

  function handleCloseSuccessModal() {
    setIsSuccessModalOpen(false)
  }

  function handleContactByWhatsApp() {
    const projectName = values.product.trim() || project?.title?.trim() || 'mi proyecto'
    const message =
      `Hola, me contacto por el proyecto "${projectName}" que acabo de enviar desde Film Locations Uruguay.`

    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer')
  }

  function handleAddLocations() {
    if (!project || !canAddLocations) {
      return
    }

    setActiveProjectContext(project.id, {
      hydrate: true,
      persist: true,
    })
    void navigate('/#explorar')
  }

  function buildProjectSelectionImages(
    projectLocations: RequestProjectLocation[],
  ): SelectedLocationImage[] {
    return projectLocations.flatMap((projectLocation) =>
      projectLocation.selectedImages.map((image) => ({
        key: getImageSelectionKey({
          locationId: projectLocation.location.id,
          locationImageId: image.locationImageId,
          imageUrl: image.imageUrl,
        }),
        imageUrl: image.imageUrl,
        locationImageId: image.locationImageId,
        sortOrder: image.sortOrder,
        locationId: projectLocation.location.id,
        locationCode: projectLocation.location.locationCode,
        locationTitle: projectLocation.location.title,
        categorySlug: projectLocation.location.categorySlug ?? '',
        selectedAt: image.createdAt,
      })),
    )
  }

  function handleOpenDraftLocation(item: RequestProjectLocation) {
    if (!project || (!isDraft && !isEditingProject)) {
      return
    }

    const existingProjectSelection = getProjectSelection(project.id)
    const projectSelectionExistsInMemory = hasProjectSelection(project.id)

    if (!projectSelectionExistsInMemory || !existingProjectSelection) {
      replaceSelection(buildProjectSelectionImages(locations), {
        projectId: project.id,
      })
    }

    setActiveProjectContext(project.id, {
      hydrate: !projectSelectionExistsInMemory,
      persist: true,
    })

    void navigate(
      buildPublicLocationPath({
        categorySlug: item.location.categorySlug,
        locationCode: item.location.locationCode,
        fallbackSlug: item.location.slug,
      }),
    )
  }

  function renderProjectIdentityPanel() {
    if (!project) {
      return null
    }

    return (
      <section className="overflow-hidden rounded-[0.3rem] border border-white/10 bg-white/4">
        <div className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0" aria-hidden="true">
            <img
              src={drawerHeaderBackgroundUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/46" />
            <div className={drawerPanelOverlayClassName} />
            <div className={drawerPanelHighlightClassName} />
          </div>
          <div className="relative px-4 py-5 sm:px-6">
            <div className="flex flex-nowrap items-center justify-between gap-2 sm:gap-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <h1 className="min-w-0 truncate font-display text-2xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-[2.35rem]">
                  Datos del proyecto
                </h1>
                <div className={isSentProject ? 'hidden sm:block' : undefined}>
                  <RequestProjectStatusBadge status={project.status} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                {isAutosaveEnabled && draftAutosaveIndicator !== 'hidden' ? (
                  <span
                    aria-live="polite"
                    aria-atomic="true"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/10 text-brand-100/78 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-12px_24px_rgba(0,0,0,0.18),0_10px_22px_rgba(0,0,0,0.14)]"
                  >
                    {draftAutosaveIndicator === 'saving' ? (
                      <span className="text-brand-300">
                        <AutosaveSpinnerIcon />
                      </span>
                    ) : null}
                    {draftAutosaveIndicator === 'saved' ? (
                      <span className="text-emerald-300">
                        <AutosaveCheckIcon />
                      </span>
                    ) : null}
                    {draftAutosaveIndicator === 'error' ? (
                      <span className="text-red-300">
                        <AutosaveErrorIcon />
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {project.officialPdf ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDownloadOfficialPdf()
                    }}
                    className={`${drawerSecondaryButtonClassName} h-10 w-10 shrink-0 px-0 sm:w-auto sm:px-3.5 sm:gap-2`}
                    aria-label="Descargar PDF"
                    title="Descargar PDF"
                  >
                    <DownloadPdfIcon />
                    <span className="hidden sm:inline">Descargar PDF</span>
                  </button>
                ) : null}
                {isSentProject && !isEditingProject && isEditableProject ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditNoticeModalOpen(true)
                    }}
                    className={`${drawerSecondaryButtonClassName} h-10 w-10 shrink-0 px-0 font-semibold sm:w-auto sm:px-3.5 sm:gap-2`}
                    aria-label="Editar proyecto"
                    title="Editar proyecto"
                  >
                    <EditProjectIcon />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                ) : null}
                {isSentProject && isEditingProject ? (
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    disabled={isSaving || isSubmitting}
                    className={`${drawerSecondaryButtonClassName} gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    <CancelEditIcon />
                    Cancelar edición
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6">
          {validationError ? (
            <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {validationError}
            </div>
          ) : null}

          <div className="pt-6">
            <SelectionPdfForm
              values={values}
              errors={formErrors}
              onChange={handleFieldChange}
              disabled={!isFormEditable || isSubmitting}
              readOnlyFields={readOnlyProjectFields}
              variant="compact"
              columns={2}
              showTentativeDates
              desktopMessageSplit
            />
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="flex flex-col gap-3" />
          </div>

          <div>
            {renderLocationsPanel()}
          </div>
        </div>

        {isEditableProject ? (
          <footer className="relative overflow-hidden border-t border-white/10">
            <div className="absolute inset-0" aria-hidden="true">
              <img
                src={drawerFooterBackgroundUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/46" />
              <div className={drawerPanelOverlayClassName} />
              <div className={drawerPanelHighlightClassName} />
            </div>
            <div className="relative px-5 py-5 sm:px-6">
              <button
                type="submit"
                disabled={
                  isSaving ||
                  isSubmitting ||
                  !canSubmitCurrentProject
                }
                className={drawerPrimaryButtonClassName}
              >
                <SubmitProposalIcon />
                {isSubmitting
                  ? isDraft
                    ? 'Enviando solicitud...'
                    : 'Enviando nueva version...'
                  : isDraft
                    ? 'Enviar solicitud'
                    : 'Enviar nueva version'}
              </button>
            </div>
          </footer>
        ) : null}
      </section>
    )
  }

  function renderLocationCard(item: RequestProjectLocation) {
    const selectedImages = item.selectedImages
    const visibleImages = selectedImages.slice(0, 4)
    const hiddenImagesCount = Math.max(0, selectedImages.length - 4)
    const isLocationInteractive = isDraft || (isSentProject && isEditingProject)

    return (
      <article
        key={item.id}
        className="py-5 first:pt-0 last:pb-0"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {isLocationInteractive ? (
              <button
                type="button"
                onClick={() => {
                  handleOpenDraftLocation(item)
                }}
                className="inline-flex items-center gap-2 cursor-pointer font-display text-[1.78rem] font-semibold leading-none tracking-[-0.03em] text-brand-100 transition hover:text-brand-300 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {item.location.title}
                <OpenLocationIcon />
              </button>
            ) : (
              <p className="font-display text-[1.78rem] font-semibold leading-none tracking-[-0.03em] text-brand-100">
                {item.location.title}
              </p>
            )}
          </div>
        </div>

        <div className="pt-5">
          {selectedImages.length > 0 ? (
            <>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pr-8 snap-x snap-mandatory sm:hidden">
                {selectedImages.map((image, index) => (
                  <div
                    key={image.id}
                    className="group relative aspect-[16/11] w-[72%] shrink-0 snap-start overflow-hidden rounded-[0.3rem] bg-white/6"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLightboxLocationId(item.location.id)
                        setActiveLightboxIndex(index)
                      }}
                      className="h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                    >
                      <img
                        src={image.imageUrl}
                        alt={`Imagen seleccionada de ${item.location.locationCode}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                    {canEditLocationImages ? (
                      <span className="absolute right-2 top-2 z-20 opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => {
                            void removeSelectedImage(item.location.id, image.id)
                          }}
                          disabled={isMutatingLocations}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/78 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                          aria-label="Quitar imagen seleccionada"
                        >
                          <RemoveSelectedImageIcon />
                        </button>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="hidden grid-cols-4 gap-3 sm:grid">
                {visibleImages.map((image, index) => {
                  const shouldShowOverflowOverlay =
                    index === visibleImages.length - 1 && hiddenImagesCount > 0

                  return (
                    <div
                      key={image.id}
                      className="group relative aspect-[4/3] min-w-0 overflow-hidden rounded-[0.3rem] bg-white/6"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveLightboxLocationId(item.location.id)
                          setActiveLightboxIndex(index)
                        }}
                        className="h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                      >
                        <img
                          src={image.imageUrl}
                          alt={`Imagen seleccionada de ${item.location.locationCode}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {canEditLocationImages ? (
                        <span className="absolute right-2 top-2 z-20 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => {
                              void removeSelectedImage(item.location.id, image.id)
                            }}
                            disabled={isMutatingLocations}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/14 bg-black/65 text-white backdrop-blur-sm transition hover:bg-black/78 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                            aria-label="Quitar imagen seleccionada"
                          >
                            <RemoveSelectedImageIcon />
                          </button>
                        </span>
                      ) : null}
                      {shouldShowOverflowOverlay ? (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/58 text-[1.75rem] font-semibold tracking-[-0.04em] text-white backdrop-blur-[1px] sm:text-[2rem]">
                          +{hiddenImagesCount}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="rounded-[1rem] border border-dashed border-white/10 bg-black/14 px-4 py-6 text-sm text-brand-300">
              Esta locación todavía no tiene imágenes seleccionadas.
            </div>
          )}
        </div>
      </article>
    )
  }

  function renderLocationsPanel() {
    return (
      <div className="space-y-5">
        {locations.length > 0 ? (
          <>
            {canAddLocations ? (
              <div className="flex justify-end pb-3">
                <button
                  type="button"
                  onClick={handleAddLocations}
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-brand-300 px-4 text-[0.8125rem] font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] sm:min-h-12 sm:gap-2 sm:px-5 sm:text-sm"
                >
                  <AddLocationsIcon />
                  Agregar locaciones
                </button>
              </div>
            ) : null}
            {locations.map((locationItem, index) => (
            <div
              key={locationItem.id}
              className={index > 0 ? 'border-t border-white/10 pt-5' : 'pt-2'}
            >
              {renderLocationCard(locationItem)}
            </div>
            ))}
          </>
        ) : isDraft ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
            <div className="max-w-sm">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                Todavía no agregaste locaciones
              </h3>
              <p className="mt-3 text-sm leading-6 text-brand-300">
                Explorá las locaciones y seleccioná las imágenes que quieras sumar a este proyecto.
              </p>
              <Link
                to="/#explorar"
                className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                + Agregar locaciones
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-black/14 px-5 py-10 text-center">
            <p className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
              Todavía no hay locaciones
            </p>
            <p className="mt-3 text-sm leading-6 text-brand-300">
              Este proyecto no tiene locaciones seleccionadas por el momento.
            </p>
          </div>
        )}
      </div>
    )
  }

  function renderProjectDetailLayout() {
    return (
      <section className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-0 py-5 sm:px-6 lg:px-8 lg:py-8">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSubmitProject()
          }}
          className="mx-auto w-full max-w-[1680px]"
        >
          <div className="space-y-6 lg:space-y-7">
            <div className="w-full">{renderProjectIdentityPanel()}</div>
          </div>
        </form>
      </section>
    )
  }

  if (notFound) {
    return <Navigate replace to="/404" />
  }

  return (
    <>
      <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
        {isLoading ? (
          <div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="space-y-6 lg:space-y-7">
              <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-white/4 p-6">
                <div className="h-12 animate-pulse rounded bg-white/10" />
                <div className="h-28 animate-pulse rounded-[1rem] bg-white/10" />
                <div className="h-56 animate-pulse rounded-[1rem] bg-white/10" />
                <div className="h-64 animate-pulse rounded-[1rem] bg-white/10" />
                <div className="h-64 animate-pulse rounded-[1rem] bg-white/10" />
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && error ? (
          <div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          </div>
        ) : null}

        {!isLoading && !error && project ? renderProjectDetailLayout() : null}
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

                await refreshProject()
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
      <AppModal
        open={isPdfPreviewOpen}
        onClose={() => {
          setIsPdfPreviewOpen(false)
        }}
        panelClassName="max-w-5xl overflow-visible rounded-none border-0 bg-transparent p-0 shadow-none"
      >
        <div className="relative max-h-[80vh] overflow-y-auto px-4 py-5 sm:px-6">
          <div className="sticky top-3 z-10 mb-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setIsPdfPreviewOpen(false)
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/14 bg-[#14110f]/82 text-brand-100 backdrop-blur-sm transition hover:bg-[#14110f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              aria-label="Cerrar vista previa del PDF"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
          <SelectionPdfPreview payload={currentPdfPayload} hideCover />
        </div>
      </AppModal>
      <ImageLightbox
        images={
          activeLightboxLocation?.selectedImages.map((image, index) => ({
            id: image.id,
            url: image.imageUrl,
            alt: `${activeLightboxLocation.location.title} · imagen ${index + 1}`,
          })) ?? []
        }
        initialIndex={activeLightboxIndex}
        isOpen={Boolean(activeLightboxLocation)}
        imageClassName="rounded-[0.3rem]"
        onClose={() => {
          setActiveLightboxLocationId(null)
          setActiveLightboxIndex(0)
        }}
      />
      <SubmissionLoadingModal
        isOpen={isLoadingModalOpen}
        title="Generando propuesta..."
        description="Estamos guardando tu proyecto y preparando el PDF."
        statusMessage={getProgressStatusMessage(submissionProgress)}
        progressPercent={submissionProgress?.percent ?? 0}
      />
      <SubmissionResultModal
        isOpen={isSuccessModalOpen}
        variant="success"
        title={
          lastSubmissionKind === 'revision'
            ? 'Nueva versión enviada correctamente'
            : 'Proyecto enviado correctamente'
        }
        description={
          successMessage ??
          (lastSubmissionKind === 'revision'
            ? 'Nuestro equipo recibió la nueva versión de tu propuesta y ya está gestionándola. Nos pondremos en contacto contigo para continuar con el proceso.'
            : 'Nuestro equipo recibió tu propuesta y ya está gestionándola. Nos pondremos en contacto contigo para continuar con el proceso.')
        }
        primaryActionLabel={isMobileCompletionFlow ? 'Ir al proyecto' : 'Ir a Mis proyectos'}
        tertiaryActionLabel="Contactar por WhatsApp"
        onPrimaryAction={() => {
          setIsSuccessModalOpen(false)
          void navigate(isMobileCompletionFlow && project ? `/requests/${project.id}` : '/requests')
        }}
        onTertiaryAction={handleContactByWhatsApp}
        onClose={handleCloseSuccessModal}
      />
    </>
  )
}

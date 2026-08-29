import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActiveProjectSelect } from '@/components/selection/ActiveProjectSelect.tsx'
import { ProposalWorkspace } from '@/components/selection/ProposalWorkspace.tsx'
import { SubmissionLoadingModal } from '@/components/submissions/SubmissionLoadingModal.tsx'
import { SubmissionResultModal } from '@/components/submissions/SubmissionResultModal.tsx'
import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { useProductionCompanyLogo } from '@/hooks/useProductionCompanyLogoUrl.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'
import {
  submitRequestProjectWithOfficialPdf,
  syncRequestProjectSelection,
} from '@/services/request-projects.service.ts'
import type { RequestProject } from '@/types/request-project.ts'
import type {
  SelectionPdfExportResult,
  SelectionPdfFailedImage,
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
  SelectionPdfFlowStep,
  SelectionPdfProgress,
} from '@/types/selection-pdf.ts'
import {
  buildSelectionPdfPayloadFromImages,
  validateSelectionPdfForm,
} from '@/utils/selection-pdf-workspace.ts'
import {
  downloadSelectionPdf,
} from '@/utils/selection-pdf-exporter.ts'
import {
  createRequestProjectFormSnapshot,
  normalizeRequestProjectFormValues,
  normalizeRequestProjectSnapshotFromProject,
} from '@/utils/request-project-form-autosave.ts'
import { canPersistSelectionForProject } from '@/utils/selection-persistence-guard.ts'
import { buildWhatsAppUrl } from '@/utils/whatsapp.ts'

type SelectionPdfFlowProps = {
  onClose: () => void
  onSuccessComplete: () => void
  isDetached: boolean
  embeddedInDrawer?: boolean
  activeProjectId: string | null
  activeProject: RequestProject | null
  draftProjects: RequestProject[]
  isLoadingProjects: boolean
  onProjectSelectionChange: (projectId: string | null) => void
  onProjectsRefresh: () => Promise<void>
  workspaceSidebarHeader?: ReactNode
  onBusyStateChange?: (isBusy: boolean) => void
  onRegisterProjectFormFlush?: (handler: (() => Promise<boolean>) | null) => void
  onAutosaveIndicatorChange?: (state: DrawerAutosaveIndicatorState) => void
  onEmbeddedPreviewChange?: (preview: ReactNode | null) => void
  onEmbeddedFooterChange?: (footer: ReactNode | null) => void
}

const initialValues: SelectionPdfFormValues = {
  product: '',
  productionCompany: '',
  productionCompanyId: null,
  tentativeStartDate: '',
  tentativeEndDate: '',
  message: '',
}

const selectionPdfFieldOrder: (keyof SelectionPdfFormValues)[] = [
  'product',
  'productionCompany',
  'tentativeStartDate',
  'tentativeEndDate',
  'message',
]
const readOnlySentProjectFields: Array<keyof SelectionPdfFormValues> = [
  'product',
  'productionCompany',
]

type DrawerAutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type DrawerAutosaveIndicatorState = 'hidden' | 'saving' | 'saved' | 'error'

function getProgressStatusMessage(
  progress: SelectionPdfProgress | null,
  createdProjectId: string | null,
) {
  if (!progress) {
    return createdProjectId
      ? 'Proyecto guardado. Preparando el documento.'
      : 'Creando el proyecto y preparando el documento.'
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

export function SelectionPdfFlow(props: SelectionPdfFlowProps) {
  const {
    onClose,
    onSuccessComplete,
    isDetached,
    embeddedInDrawer = false,
    activeProjectId,
    activeProject,
    draftProjects,
    isLoadingProjects,
    onProjectSelectionChange,
    onProjectsRefresh,
    workspaceSidebarHeader,
    onBusyStateChange,
    onRegisterProjectFormFlush,
    onAutosaveIndicatorChange,
    onEmbeddedPreviewChange,
    onEmbeddedFooterChange,
  } = props
  const navigate = useNavigate()
  const { role } = useAuth()
  const { images } = useImageSelection()
  const {
    activeEditingProjectId,
    registerProjectEditingExitHandler,
    updateProject,
  } = useRequestProjects()
  const [step, setStep] = useState<SelectionPdfFlowStep>('form')
  const [values, setValues] = useState<SelectionPdfFormValues>(initialValues)
  const [errors, setErrors] = useState<SelectionPdfFormErrors>({})
  const [progress, setProgress] = useState<SelectionPdfProgress | null>(null)
  const [exportResult, setExportResult] = useState<SelectionPdfExportResult | null>(null)
  const [failedImages, setFailedImages] = useState<SelectionPdfFailedImage[]>([])
  const [exportError, setExportError] = useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [submittedProjectId, setSubmittedProjectId] = useState<string | null>(null)
  const [projectSavedBeforeError, setProjectSavedBeforeError] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false)
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [, setAutosaveStatus] = useState<DrawerAutosaveStatus>('idle')
  const [autosaveIndicator, setAutosaveIndicator] = useState<DrawerAutosaveIndicatorState>('hidden')
  const autosaveTimeoutRef = useRef<number | null>(null)
  const autosavePromiseRef = useRef<Promise<boolean> | null>(null)
  const autosaveExecutionTokenRef = useRef<symbol | null>(null)
  const autosaveRequestVersionRef = useRef(0)
  const autosaveSuccessTimeoutRef = useRef<number | null>(null)
  const latestSnapshotRef = useRef<string | null>(null)
  const latestNormalizedValuesRef = useRef<ReturnType<typeof normalizeRequestProjectFormValues> | null>(null)
  const persistedSnapshotRef = useRef<string | null>(null)
  const hydratedProjectIdRef = useRef<string | null>(null)
  const submitProposalRef = useRef<() => Promise<void>>(async () => {})

  const isSentProject = Boolean(activeProject && activeProject.status !== 'draft')
  const protectedFormValues = useMemo<SelectionPdfFormValues>(() => {
    if (!activeProject || activeProject.status === 'draft') {
      return values
    }

    return {
      ...values,
      product: activeProject.title,
      productionCompany: activeProject.productionCompany ?? '',
      productionCompanyId: activeProject.productionCompanyId,
    }
  }, [activeProject, values])
  const {
    logoUrl: productionCompanyLogoUrl,
  } = useProductionCompanyLogo(
    protectedFormValues.productionCompanyId,
  )
  const livePreviewPayload = useMemo(
    () => {
      const basePayload = buildSelectionPdfPayloadFromImages(
        protectedFormValues,
        images,
      )

      return {
        ...basePayload,
        project: {
          ...basePayload.project,
          productionCompanyLogoUrl,
        },
      }
    },
    [images, productionCompanyLogoUrl, protectedFormValues],
  )
  const normalizedProjectValues = useMemo(
    () => normalizeRequestProjectFormValues(protectedFormValues),
    [protectedFormValues],
  )
  const currentProjectSnapshot = useMemo(
    () => createRequestProjectFormSnapshot(normalizedProjectValues),
    [normalizedProjectValues],
  )
  const readOnlyFields = useMemo<Array<keyof SelectionPdfFormValues>>(
    () => (isSentProject ? readOnlySentProjectFields : []),
    [isSentProject],
  )
  const isProjectAutosaveEnabled = Boolean(
    activeProject &&
      (activeProject.status === 'draft' || activeProject.id === activeEditingProjectId),
  )
  const isProjectLocked = Boolean(activeProject && !isProjectAutosaveEnabled)
  const embeddedPreview = useMemo(
    () => <SelectionPdfPreview payload={livePreviewPayload} hideCover />,
    [livePreviewPayload],
  )

  const hasSelectedImages = images.length > 0
  const isBusy = isSubmittingProposal || isLoadingModalOpen
  const isMobileCompletionFlow =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches

  useEffect(() => {
    latestSnapshotRef.current = currentProjectSnapshot
    latestNormalizedValuesRef.current = normalizedProjectValues
  }, [currentProjectSnapshot, normalizedProjectValues])

  useEffect(() => {
    onBusyStateChange?.(isBusy)

    return () => {
      onBusyStateChange?.(false)
    }
  }, [isBusy, onBusyStateChange])

  function resetFlowState() {
    setStep('form')
    setProgress(null)
    setExportResult(null)
    setFailedImages([])
    setExportError(null)
    setCreatedProjectId(null)
    setSubmittedProjectId(null)
    setProjectSavedBeforeError(false)
    setIsLoadingModalOpen(false)
    setIsSuccessModalOpen(false)
  }

  function renderProjectHeader(disabled = false) {
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <ActiveProjectSelect
          activeProjectId={activeProjectId}
          projects={draftProjects}
          activeProject={activeProject}
          isLoading={isLoadingProjects}
          disabled={disabled || isBusy}
          compact
          onChange={onProjectSelectionChange}
        />
        <span
          aria-live="polite"
          aria-atomic="true"
          className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center"
        >
          {isProjectAutosaveEnabled && autosaveIndicator === 'saving' ? (
            <span className="text-brand-300">
              <AutosaveSpinnerIcon />
            </span>
          ) : null}
          {isProjectAutosaveEnabled && autosaveIndicator === 'saved' ? (
            <span className="text-emerald-300">
              <AutosaveCheckIcon />
            </span>
          ) : null}
          {isProjectAutosaveEnabled && autosaveIndicator === 'error' ? (
            <span className="text-red-300">
              <AutosaveErrorIcon />
            </span>
          ) : null}
        </span>
      </div>
    )
  }

  function applyProjectToForm(project: RequestProject | null) {
    if (!project) {
      hydratedProjectIdRef.current = null
      persistedSnapshotRef.current = null
      setAutosaveStatus('idle')
      setAutosaveIndicator('hidden')
      setValues(initialValues)
      setErrors({})
      setDraftNotice(null)
      return
    }

    const normalizedPersistedValues = normalizeRequestProjectSnapshotFromProject(project)
    const nextPersistedSnapshot = createRequestProjectFormSnapshot(normalizedPersistedValues)
    persistedSnapshotRef.current = nextPersistedSnapshot

    if (hydratedProjectIdRef.current === project.id) {
      if (latestSnapshotRef.current === nextPersistedSnapshot) {
        setAutosaveStatus('saved')
      }
      return
    }

    const mappedValues = {
      ...initialValues,
      product: project.title,
      productionCompany: project.productionCompany ?? '',
      productionCompanyId: project.productionCompanyId,
      tentativeStartDate: project.tentativeStartDate ?? '',
      tentativeEndDate: project.tentativeEndDate ?? '',
      message: project.message ?? '',
    }

    hydratedProjectIdRef.current = project.id
    setValues(mappedValues)
    setErrors({})
    setDraftNotice(null)
    setAutosaveStatus(project.status === 'draft' ? 'saved' : 'idle')
  }

  useEffect(() => {
    applyProjectToForm(activeProjectId ? activeProject : null)
  }, [activeProject, activeProjectId])

  useEffect(() => {
    if (
      !activeProjectId ||
      !activeProject ||
      !isProjectAutosaveEnabled ||
      hydratedProjectIdRef.current !== activeProject.id
    ) {
      return
    }

    if (currentProjectSnapshot === persistedSnapshotRef.current) {
      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
        autosaveTimeoutRef.current = null
      }

      if (!autosavePromiseRef.current) {
        setAutosaveStatus('saved')
      }
      return
    }

    setDraftNotice(null)
    setAutosaveStatus('saving')

    if (autosavePromiseRef.current) {
      return
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
    }

    const requestVersion = autosaveRequestVersionRef.current + 1
    autosaveRequestVersionRef.current = requestVersion
    const snapshotAtSchedule = currentProjectSnapshot
    const valuesAtSchedule = normalizedProjectValues
    const projectIdAtSchedule = activeProject.id

    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null

      if (
        hydratedProjectIdRef.current !== projectIdAtSchedule ||
        autosaveRequestVersionRef.current !== requestVersion ||
        persistedSnapshotRef.current === snapshotAtSchedule
      ) {
        return
      }

      void runProjectAutosave(snapshotAtSchedule, valuesAtSchedule, requestVersion)
    }, 800)
  }, [
    activeProject,
    activeProjectId,
    currentProjectSnapshot,
    isProjectAutosaveEnabled,
    normalizedProjectValues,
  ])

  useEffect(() => {
    if (!onRegisterProjectFormFlush) {
      return
    }

    if (!activeProjectId || !activeProject) {
      onRegisterProjectFormFlush(null)
      return
    }

    onRegisterProjectFormFlush(flushProjectAutosave)

    return () => {
      onRegisterProjectFormFlush(null)
    }
  }, [activeProject, activeProjectId, onRegisterProjectFormFlush])

  useEffect(() => {
    onAutosaveIndicatorChange?.(
      isProjectAutosaveEnabled ? autosaveIndicator : 'hidden',
    )

    return () => {
      onAutosaveIndicatorChange?.('hidden')
    }
  }, [autosaveIndicator, isProjectAutosaveEnabled, onAutosaveIndicatorChange])

  useEffect(() => {
    if (!activeProject || !isSentProject || !isProjectAutosaveEnabled) {
      return
    }

    return registerProjectEditingExitHandler(activeProject.id, flushProjectAutosave)
  }, [
    activeProject,
    isProjectAutosaveEnabled,
    isSentProject,
    registerProjectEditingExitHandler,
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

  function handleFieldChange(
    field: keyof SelectionPdfFormValues,
    value: string | null,
  ) {
    if (
      activeProject?.status !== 'draft' &&
      (
        field === 'product' ||
        field === 'productionCompany' ||
        field === 'productionCompanyId'
      )
    ) {
      return
    }

    setValues((currentValues) => ({
      ...currentValues,
      [field]:
        field === 'productionCompanyId'
          ? value
          : value ?? '',
      ...(field === 'productionCompany' &&
      currentValues.productionCompanyId &&
      value !== currentValues.productionCompany
        ? { productionCompanyId: null }
        : {}),
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

  async function runProjectAutosave(
    snapshot: string,
    nextValues: ReturnType<typeof normalizeRequestProjectFormValues>,
    requestVersion: number,
  ) {
    if (!activeProjectId || !activeProject || !isProjectAutosaveEnabled) {
      return true
    }

    const protectedProjectValues =
      activeProject.status === 'draft'
        ? nextValues
        : {
            ...nextValues,
            title: activeProject.title,
            productionCompany: activeProject.productionCompany ?? '',
            productionCompanyId: activeProject.productionCompanyId,
          }

    const autosaveExecutionToken = Symbol('drawer-project-autosave')
    const autosavePromise = (async () => {
      try {
        if (autosaveSuccessTimeoutRef.current !== null) {
          window.clearTimeout(autosaveSuccessTimeoutRef.current)
          autosaveSuccessTimeoutRef.current = null
        }

        setAutosaveIndicator('saving')

        const savedProject = await updateProject(activeProjectId, {
          title: protectedProjectValues.title,
          productionCompany: protectedProjectValues.productionCompany,
          productionCompanyId: protectedProjectValues.productionCompanyId,
          message: protectedProjectValues.message,
          tentativeStartDate: protectedProjectValues.tentativeStartDate,
          tentativeEndDate: protectedProjectValues.tentativeEndDate,
        })

        if (!savedProject) {
          if (autosaveRequestVersionRef.current === requestVersion) {
            setAutosaveStatus('error')
            setAutosaveIndicator('error')
          }
          return false
        }

        persistedSnapshotRef.current = snapshot

        if (
          autosaveRequestVersionRef.current === requestVersion &&
          latestSnapshotRef.current === snapshot
        ) {
          setAutosaveStatus('saved')
          setAutosaveIndicator('saved')
          autosaveSuccessTimeoutRef.current = window.setTimeout(() => {
            autosaveSuccessTimeoutRef.current = null
            setAutosaveIndicator((current) =>
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

        const latestSnapshot = latestSnapshotRef.current
        const latestNormalizedValues = latestNormalizedValuesRef.current

        if (
          isProjectAutosaveEnabled &&
          latestSnapshot &&
          latestNormalizedValues &&
          latestSnapshot !== persistedSnapshotRef.current
        ) {
          const nextRequestVersion = autosaveRequestVersionRef.current + 1
          autosaveRequestVersionRef.current = nextRequestVersion
          setAutosaveStatus('saving')
          void runProjectAutosave(
            latestSnapshot,
            latestNormalizedValues,
            nextRequestVersion,
          )
        }
      }
    })()

    autosaveExecutionTokenRef.current = autosaveExecutionToken
    autosavePromiseRef.current = autosavePromise
    return autosavePromise
  }

  async function flushProjectAutosave() {
    if (!activeProjectId || !activeProject || !isProjectAutosaveEnabled) {
      return true
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    if (autosavePromiseRef.current) {
      await autosavePromiseRef.current
    }

    const latestSnapshot = latestSnapshotRef.current
    const latestNormalizedValues = latestNormalizedValuesRef.current

    if (
      latestSnapshot &&
      latestNormalizedValues &&
      latestSnapshot !== persistedSnapshotRef.current
    ) {
      const requestVersion = autosaveRequestVersionRef.current + 1
      autosaveRequestVersionRef.current = requestVersion
      setAutosaveStatus('saving')
      return runProjectAutosave(
        latestSnapshot,
        latestNormalizedValues,
        requestVersion,
      )
    }

    return true
  }

  function focusFirstInvalidField(nextErrors: SelectionPdfFormErrors) {
    const firstInvalidField = selectionPdfFieldOrder.find((field) => nextErrors[field])

    if (!firstInvalidField) {
      return
    }

    window.requestAnimationFrame(() => {
      const field = document.getElementById(firstInvalidField)

      if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
        field.focus()
      }
    })
  }

  function validateProposalSubmission() {
    const nextErrors = validateSelectionPdfForm(values)

    if (role !== 'admin' && nextErrors.productionCompany) {
      nextErrors.productionCompany = 'Completa la Productora en Mi cuenta antes de enviar el proyecto.'
    }

    if (Object.keys(nextErrors).length === 0) {
      setErrors({})
      return true
    }

    setErrors(nextErrors)
    setDraftNotice(null)
    setStep('form')
    focusFirstInvalidField(nextErrors)
    return false
  }

  async function persistProposalDraft() {
    if (!activeProjectId || !activeProject) {
      throw new Error('Debes crear o seleccionar un proyecto antes de continuar.')
    }

    setExportError(null)
    const draftPayload = {
      title:
        activeProject.status === 'draft'
          ? values.product.trim()
          : activeProject.title,
      productionCompany:
        activeProject.status === 'draft'
          ? values.productionCompany.trim() || null
          : activeProject.productionCompany,
      productionCompanyId:
        activeProject.status === 'draft'
          ? values.productionCompanyId
          : activeProject.productionCompanyId,
      message: values.message.trim() || null,
      tentativeStartDate: values.tentativeStartDate.trim() || null,
      tentativeEndDate: values.tentativeEndDate.trim() || null,
    }

    const projectId = activeProjectId

    try {
      if (isProjectAutosaveEnabled) {
        const didFlushAutosave = await flushProjectAutosave()

        if (!didFlushAutosave) {
          throw new Error('No pudimos guardar el borrador.')
        }
      } else {
        const updatedProject = await updateProject(projectId, draftPayload)

        if (!updatedProject) {
          throw new Error('No pudimos guardar el borrador.')
        }
      }

      setCreatedProjectId(projectId)

      if (!canPersistSelectionForProject(projectId)) {
        throw new Error('Estamos terminando de cargar la seleccion del proyecto. Intenta nuevamente en unos segundos.')
      }

      await syncRequestProjectSelection(projectId, images, {
        allowEmptySelection: false,
      })

      await onProjectsRefresh()
      setDraftNotice('Borrador actualizado.')

      return {
        projectId,
      }
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'No pudimos guardar el borrador.',
      )
      setDraftNotice(null)
      return null
    }
  }

  async function handleSubmitProposal() {
    if (isBusy) {
      return
    }

    setExportError(null)
    setExportResult(null)
    setFailedImages([])
    setProgress(null)

    if (!validateProposalSubmission() || !hasSelectedImages) {
      return
    }

    setIsSubmittingProposal(true)
    setProgress({
      stage: 'saving-project',
      percent: 0,
    })

    try {
      const draftResult = await persistProposalDraft()

      if (!draftResult) {
        return
      }

      setDraftNotice(null)
      setProgress({
        stage: 'saving-project',
        percent: 5,
      })
      setProjectSavedBeforeError(true)
      setStep('generating')
      setIsLoadingModalOpen(true)

      const submissionResult = await submitRequestProjectWithOfficialPdf({
        projectId: draftResult.projectId,
        payload: livePreviewPayload,
        onProgress: (nextProgress) => {
          setProgress(nextProgress)
        },
        onPdfReady: (nextExportResult) => {
          setExportResult(nextExportResult)
        },
      })

      await onProjectsRefresh()
      setProgress({
        stage: 'completed',
        percent: 100,
        current: submissionResult.exportResult.totalImages,
        total: submissionResult.exportResult.totalImages,
      })
      setSubmittedProjectId(submissionResult.project.id)
      setExportResult(submissionResult.exportResult)
      setFailedImages(submissionResult.exportResult.failedImages)
      setIsLoadingModalOpen(false)
      setStep('success')
      setIsSuccessModalOpen(true)

      if (!isMobileCompletionFlow) {
        downloadSelectionPdf(
          submissionResult.exportResult.blob,
          submissionResult.exportResult.fileName,
        )
      }
    } catch (error) {
      setIsLoadingModalOpen(false)
      setExportError(
        error instanceof Error ? error.message : 'No pudimos completar la propuesta.',
      )
      setStep('error')
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  submitProposalRef.current = handleSubmitProposal

  function handleExitAfterSuccess() {
    resetFlowState()
    onSuccessComplete()
    navigate(
      isMobileCompletionFlow && submittedProjectId
        ? `/requests/${submittedProjectId}`
        : '/requests',
    )
  }

  function handleContactByWhatsApp() {
    const projectName = values.product.trim() || activeProject?.title?.trim() || 'mi proyecto'
    const message =
      `Hola, me contacto por el proyecto "${projectName}" que acabo de enviar desde Film Locations Uruguay.`

    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer')
  }

  function renderDetachedPreview() {
    return <SelectionPdfPreview payload={livePreviewPayload} hideCover />
  }

  function renderDetachedStatusBody() {
    if (step === 'generating') {
      return (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-brand-300/25 bg-brand-300/10 p-5">
            <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
              Guardando proyecto y generando PDF...
            </h3>
            <p aria-live="polite" className="mt-3 text-sm leading-6 text-brand-300">
              {getProgressStatusMessage(progress, createdProjectId)}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-brand-300 transition-[width] duration-300 ease-out"
                style={{
                  width: progress
                    ? `${Math.max(0, Math.min(100, progress.percent))}%`
                    : '8%',
                }}
              />
            </div>
          </div>
        </div>
      )
    }

    if (step === 'success') {
      return (
        <div className="space-y-6">
          <div className="rounded-[1.5rem] border border-brand-300/25 bg-brand-300/10 p-5">
            <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
              El proyecto y el PDF oficial se guardaron correctamente
            </h3>
            <p className="mt-3 text-sm leading-6 text-brand-300">
              {failedImages.length > 0
                ? 'La solicitud se envio, pero detectamos imagenes omitidas.'
                : 'La propuesta se envio y el documento oficial se guardo con todas las imagenes disponibles.'}
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
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="rounded-[1.5rem] border border-red-300/30 bg-red-200/10 p-5">
          <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
            No pudimos completar la propuesta
          </h3>
          <p className="mt-3 text-sm leading-6 text-red-100">
            {projectSavedBeforeError
              ? `El proyecto sigue guardado como borrador, pero no pudimos oficializar el PDF.${exportError ? ` ${exportError}` : ''}`
              : exportError ?? 'Ocurrio un problema durante la generacion.'}
          </p>
        </div>
      </div>
    )
  }

  function renderDetachedFooter() {
    if (step === 'success' || step === 'error') {
      return (
        <button
          type="button"
          onClick={() => {
            setStep('form')
          }}
          className={`inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] ${
            step === 'success'
              ? 'border border-white/12 text-brand-100 hover:bg-white/6'
              : 'bg-brand-300 text-brand-950 hover:bg-brand-100'
          }`}
        >
          {step === 'success' ? 'Volver al formulario' : 'Editar datos'}
        </button>
      )
    }

    return null
  }

  function renderFormSidebarBody() {
    return (
      <div className="space-y-4">
        {draftNotice ? (
          <div className="rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {draftNotice}
          </div>
        ) : null}
        {exportError ? (
          <div className="rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {exportError}
          </div>
        ) : null}
        <SelectionPdfForm
          values={values}
          errors={errors}
          onChange={handleFieldChange}
          disabled={isBusy || isProjectLocked}
          readOnlyFields={readOnlyFields}
          columns={2}
        />
      </div>
    )
  }

  const formSidebarFooter = useMemo(
    () => (
      <div className="flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            void submitProposalRef.current()
          }}
          disabled={!hasSelectedImages || isBusy || isProjectLocked}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/60 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_32px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-14px_32px_rgba(0,0,0,0.18),0_14px_28px_rgba(0,0,0,0.18)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
        >
          <SubmitProposalIcon />
          {isSentProject ? 'Enviar nueva version' : 'Solicitar'}
        </button>
      </div>
    ),
    [hasSelectedImages, isBusy, isProjectLocked, isSentProject],
  )

  useEffect(() => {
    if (!onEmbeddedPreviewChange) {
      return
    }

    if (embeddedInDrawer && !isDetached) {
      onEmbeddedPreviewChange(embeddedPreview)
      return () => {
        onEmbeddedPreviewChange(null)
      }
    }

    onEmbeddedPreviewChange(null)
  }, [embeddedInDrawer, embeddedPreview, isDetached, onEmbeddedPreviewChange])

  useEffect(() => {
    if (!onEmbeddedFooterChange) {
      return
    }

    if (embeddedInDrawer && !isDetached) {
      onEmbeddedFooterChange(formSidebarFooter)
      return () => {
        onEmbeddedFooterChange(null)
      }
    }

    onEmbeddedFooterChange(null)
  }, [embeddedInDrawer, formSidebarFooter, isDetached, onEmbeddedFooterChange])

  return (
    <>
      {!isDetached ? embeddedInDrawer ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            <div className="space-y-6">{renderFormSidebarBody()}</div>
          </div>
        </div>
      ) : (
        <ProposalWorkspace
          preview={embeddedPreview}
          sidebarTitle="Datos del proyecto"
          sidebarHeader={workspaceSidebarHeader ?? renderProjectHeader()}
          sidebarBody={renderFormSidebarBody()}
          sidebarFooter={formSidebarFooter}
          previewSectionClassName="bg-white/[0.035] backdrop-blur-xl"
          closeDisabled={isBusy}
          onClose={onClose}
        />
      ) : (
        <ProposalWorkspace
          preview={renderDetachedPreview()}
          sidebarTitle="Datos del proyecto"
          sidebarHeader={renderProjectHeader(step === 'generating' || isBusy)}
          previewSectionClassName="bg-white/[0.035] backdrop-blur-xl"
          sidebarBody={
            step === 'form'
              ? renderFormSidebarBody()
              : isLoadingModalOpen
                ? <div aria-hidden="true" className="min-h-[240px]" />
                : renderDetachedStatusBody()
          }
          sidebarFooter={
            step === 'form'
              ? formSidebarFooter
              : isLoadingModalOpen
                ? null
                : renderDetachedFooter()
          }
          closeDisabled={step === 'generating' || isSuccessModalOpen || isBusy}
          hidePreviewOnMobile
          onClose={onClose}
        />
      )}

      <SubmissionLoadingModal
        isOpen={isLoadingModalOpen}
        title="Generando propuesta..."
        description="Estamos guardando tu proyecto y preparando el PDF."
        statusMessage={getProgressStatusMessage(progress, createdProjectId)}
        progressPercent={progress?.percent ?? 0}
      />

      <SubmissionResultModal
        isOpen={isSuccessModalOpen}
        variant="success"
        title="Proyecto enviado correctamente"
        description="Nuestro equipo recibió tu propuesta y ya está gestionándola. Nos pondremos en contacto contigo para continuar con el proceso."
        primaryActionLabel={isMobileCompletionFlow ? 'Ir al proyecto' : 'Ir a Mis proyectos'}
        tertiaryActionLabel="Contactar por WhatsApp"
        onPrimaryAction={handleExitAfterSuccess}
        onTertiaryAction={handleContactByWhatsApp}
        onClose={handleExitAfterSuccess}
      />
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActiveProjectSelect } from '@/components/selection/ActiveProjectSelect.tsx'
import { ProposalWorkspace } from '@/components/selection/ProposalWorkspace.tsx'
import { SubmissionLoadingModal } from '@/components/submissions/SubmissionLoadingModal.tsx'
import { SubmissionResultModal } from '@/components/submissions/SubmissionResultModal.tsx'
import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
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
  SelectionPdfPayload,
  SelectionPdfProgress,
} from '@/types/selection-pdf.ts'
import {
  buildRequestProjectMessageFromPdfForm,
  buildSelectionPdfPayloadFromImages,
  validateSelectionPdfForm,
} from '@/utils/selection-pdf-workspace.ts'
import { downloadSelectionPdf } from '@/utils/selection-pdf-exporter.ts'

type SelectionPdfFlowProps = {
  onClose: () => void
  onSuccessComplete: () => void
  isDetached: boolean
  embeddedInDrawer?: boolean
  onStartProcessing: () => void
  onRestoreAfterError: () => void
  activeProjectId: string | null
  activeProject: RequestProject | null
  draftProjects: RequestProject[]
  isLoadingProjects: boolean
  onProjectSelectionChange: (projectId: string | null) => void
  onPersistedProjectChange: (projectId: string) => void
  onProjectsRefresh: () => Promise<void>
  onBusyStateChange?: (isBusy: boolean) => void
}

const initialValues: SelectionPdfFormValues = {
  product: '',
  productionCompany: '',
  locationManager: '',
  email: '',
  tentativeStartDate: '',
  tentativeEndDate: '',
}

const selectionPdfFieldOrder: (keyof SelectionPdfFormValues)[] = [
  'product',
  'productionCompany',
  'locationManager',
  'email',
  'tentativeStartDate',
  'tentativeEndDate',
]

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

export function SelectionPdfFlow(props: SelectionPdfFlowProps) {
  const {
    onClose,
    onSuccessComplete,
    isDetached,
    embeddedInDrawer = false,
    onStartProcessing,
    onRestoreAfterError,
    activeProjectId,
    activeProject,
    draftProjects,
    isLoadingProjects,
    onProjectSelectionChange,
    onPersistedProjectChange,
    onProjectsRefresh,
    onBusyStateChange,
  } = props
  const navigate = useNavigate()
  const { images, clearSelection } = useImageSelection()
  const { createProject, updateProject } = useRequestProjects()
  const [step, setStep] = useState<SelectionPdfFlowStep>('form')
  const [values, setValues] = useState<SelectionPdfFormValues>(initialValues)
  const [errors, setErrors] = useState<SelectionPdfFormErrors>({})
  const [progress, setProgress] = useState<SelectionPdfProgress | null>(null)
  const [exportResult, setExportResult] = useState<SelectionPdfExportResult | null>(null)
  const [failedImages, setFailedImages] = useState<SelectionPdfFailedImage[]>([])
  const [exportError, setExportError] = useState<string | null>(null)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [projectSavedBeforeError, setProjectSavedBeforeError] = useState(false)
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
  const [isDraftSuccessModalOpen, setIsDraftSuccessModalOpen] = useState(false)
  const [draftSuccessProjectId, setDraftSuccessProjectId] = useState<string | null>(null)
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)

  const livePreviewPayload = useMemo(
    () => buildSelectionPdfPayloadFromImages(values, images),
    [images, values],
  )

  const hasSelectedImages = images.length > 0
  const isBusy = isSavingDraft || isSubmittingProposal || isLoadingModalOpen

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
    setProjectSavedBeforeError(false)
    setIsLoadingModalOpen(false)
    setIsSuccessModalOpen(false)
    setIsDraftSuccessModalOpen(false)
    setDraftSuccessProjectId(null)
  }

  function renderProjectHeader(disabled = false, compact = false) {
    return (
      <div className="min-w-0 flex-1">
        <div className={`${compact ? 'mb-0' : 'mb-3'} flex min-h-11 items-center`}>
          <p className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
            Seleccionar proyecto
          </p>
        </div>
        <div className={compact ? 'mt-3' : ''}>
          <ActiveProjectSelect
            activeProjectId={activeProjectId}
            projects={draftProjects}
            isLoading={isLoadingProjects}
            disabled={disabled || isBusy}
            compact
            onChange={onProjectSelectionChange}
          />
        </div>
      </div>
    )
  }

  function applyProjectToForm(project: RequestProject | null) {
    if (!project) {
      setValues(initialValues)
      setErrors({})
      setDraftNotice(null)
      return
    }

    const mappedValues = {
      ...initialValues,
      product: project.title,
      tentativeStartDate: project.tentativeStartDate ?? '',
      tentativeEndDate: project.tentativeEndDate ?? '',
    }

    const message = project.message ?? ''

    for (const rawLine of message.split('\n')) {
      const line = rawLine.trim()

      if (line.startsWith('Empresa:')) {
        mappedValues.productionCompany = line.slice('Empresa:'.length).trim()
        continue
      }

      if (line.startsWith('Location manager:')) {
        mappedValues.locationManager = line.slice('Location manager:'.length).trim()
        continue
      }

      if (line.startsWith('Email:')) {
        mappedValues.email = line.slice('Email:'.length).trim()
      }
    }

    setValues(mappedValues)
    setErrors({})
    setDraftNotice(null)
  }

  useEffect(() => {
    applyProjectToForm(activeProjectId ? activeProject : null)
  }, [activeProject, activeProjectId])

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

  function focusFirstInvalidField(nextErrors: SelectionPdfFormErrors) {
    const firstInvalidField = selectionPdfFieldOrder.find((field) => nextErrors[field])

    if (!firstInvalidField) {
      return
    }

    window.requestAnimationFrame(() => {
      const field = document.getElementById(firstInvalidField)

      if (field instanceof HTMLInputElement) {
        field.focus()
      }
    })
  }

  function validateProposalSubmission() {
    const nextErrors = validateSelectionPdfForm(values)

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
    setExportError(null)
    const draftPayload = {
      title: values.product.trim(),
      message: buildRequestProjectMessageFromPdfForm(values),
      tentativeStartDate: values.tentativeStartDate.trim() || null,
      tentativeEndDate: values.tentativeEndDate.trim() || null,
    }

    let projectId = activeProjectId
    let created = false

    try {
      if (!projectId) {
        const createdProject = await createProject(draftPayload)

        if (!createdProject) {
          throw new Error('No pudimos guardar el borrador.')
        }

        projectId = createdProject.id
        created = true
        setCreatedProjectId(projectId)
        onPersistedProjectChange(projectId)
      } else {
        const updatedProject = await updateProject(projectId, draftPayload)

        if (!updatedProject) {
          throw new Error('No pudimos guardar el borrador.')
        }

        setCreatedProjectId(projectId)
      }

      await syncRequestProjectSelection(projectId, images)

      await onProjectsRefresh()
      setDraftNotice(created ? 'Borrador guardado.' : 'Borrador actualizado.')

      return {
        projectId,
        created,
      }
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : 'No pudimos guardar el borrador.',
      )
      setDraftNotice(null)
      return null
    }
  }

  async function handleSaveDraft() {
    if (isBusy) {
      return
    }

    setIsSavingDraft(true)
    const draftResult = await persistProposalDraft()

    try {
      if (!draftResult) {
        return
      }

      setDraftNotice(null)
      setDraftSuccessProjectId(draftResult.projectId)
      setIsDraftSuccessModalOpen(true)
    } finally {
      setIsSavingDraft(false)
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

    try {
      const draftResult = await persistProposalDraft()

      if (!draftResult) {
        return
      }

      setDraftNotice(null)
      const payload: SelectionPdfPayload = livePreviewPayload
      setProjectSavedBeforeError(true)
      setStep('generating')
      setIsLoadingModalOpen(true)
      onStartProcessing()

      const submissionResult = await submitRequestProjectWithOfficialPdf({
        projectId: draftResult.projectId,
        payload,
        onProgress: (nextProgress) => {
          setProgress(nextProgress)
        },
        onPdfReady: (nextExportResult) => {
          setExportResult(nextExportResult)
        },
      })

      downloadSelectionPdf(
        submissionResult.exportResult.blob,
        submissionResult.exportResult.fileName,
      )
      await onProjectsRefresh()
      setExportResult(submissionResult.exportResult)
      setFailedImages(submissionResult.exportResult.failedImages)
      clearSelection()
      setIsLoadingModalOpen(false)
      setStep('success')
      setIsSuccessModalOpen(true)
    } catch (error) {
      setIsLoadingModalOpen(false)
      onRestoreAfterError()
      setExportError(
        error instanceof Error ? error.message : 'No pudimos completar la propuesta.',
      )
      setStep('error')
    } finally {
      setIsSubmittingProposal(false)
    }
  }

  function handleSuccessModalClose() {
    resetFlowState()
    onSuccessComplete()
    navigate('/requests')
  }

  function renderDetachedPreview() {
    return <SelectionPdfPreview payload={livePreviewPayload} />
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
              {progress
                ? `Procesando imagen ${progress.current} de ${progress.total}${progress.locationCode ? ` · ${progress.locationCode}` : ''}`
                : createdProjectId
                  ? 'Proyecto guardado. Preparando el documento.'
                  : 'Creando el proyecto y preparando el documento.'}
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
        {draftNotice && !isDraftSuccessModalOpen ? (
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
          disabled={isBusy}
          columns={2}
        />
      </div>
    )
  }

  function renderFormSidebarFooter() {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            void handleSaveDraft()
          }}
          disabled={isBusy}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
        >
          <DraftSaveIcon />
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={() => {
            void handleSubmitProposal()
          }}
          disabled={!hasSelectedImages || isBusy}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
        >
          <SubmitProposalIcon />
          Enviar propuesta
        </button>
      </div>
    )
  }

  return (
    <>
      {!isDetached ? embeddedInDrawer ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
            {renderFormSidebarBody()}
          </div>

          <footer className="shrink-0 border-t border-white/10 px-4 py-4 sm:px-5">
            {renderFormSidebarFooter()}
          </footer>
        </div>
      ) : (
        <ProposalWorkspace
          preview={<SelectionPdfPreview payload={livePreviewPayload} />}
          sidebarTitle="Datos del proyecto"
          sidebarHeader={renderProjectHeader()}
          sidebarBody={renderFormSidebarBody()}
          sidebarFooter={renderFormSidebarFooter()}
          closeDisabled={isBusy}
          onClose={onClose}
        />
      ) : (
        <ProposalWorkspace
          preview={renderDetachedPreview()}
          sidebarTitle="Datos del proyecto"
          sidebarHeader={renderProjectHeader(step === 'generating' || isBusy, true)}
          sidebarBody={step === 'form' ? renderFormSidebarBody() : renderDetachedStatusBody()}
          sidebarFooter={step === 'form' ? renderFormSidebarFooter() : renderDetachedFooter()}
          closeDisabled={step === 'generating' || isSuccessModalOpen || isBusy}
          onClose={onClose}
        />
      )}

      <SubmissionLoadingModal
        isOpen={isLoadingModalOpen}
        title="Generando propuesta..."
        description="Estamos guardando tu proyecto y preparando el PDF."
        statusMessage={
          progress
            ? `Procesando imagen ${progress.current} de ${progress.total}${progress.locationCode ? ` · ${progress.locationCode}` : ''}`
            : createdProjectId
              ? 'Proyecto guardado. Preparando el documento.'
              : 'Creando el proyecto y preparando el documento.'
        }
      />

      <SubmissionResultModal
        isOpen={isSuccessModalOpen}
        variant="success"
        title="Proyecto creado correctamente"
        description="La solicitud fue enviada y el PDF oficial se descargó correctamente."
        primaryActionLabel="Ir a Mis proyectos"
        onPrimaryAction={handleSuccessModalClose}
        onClose={handleSuccessModalClose}
      />

      <SubmissionResultModal
        isOpen={isDraftSuccessModalOpen}
        variant="success"
        title="Guardado con éxito"
        description="Tu borrador se guardó correctamente."
        primaryActionLabel="Continuar"
        secondaryActionLabel="Ir al proyecto"
        onPrimaryAction={() => {
          setIsDraftSuccessModalOpen(false)
        }}
        onSecondaryAction={() => {
          const projectId = draftSuccessProjectId
          setIsDraftSuccessModalOpen(false)

          if (projectId) {
            navigate(`/requests/${projectId}`)
            return
          }

          navigate('/requests')
        }}
        onClose={() => {
          setIsDraftSuccessModalOpen(false)
        }}
      />
    </>
  )
}

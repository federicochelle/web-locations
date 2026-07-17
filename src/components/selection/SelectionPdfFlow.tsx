import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ActiveProjectSelect } from '@/components/selection/ActiveProjectSelect.tsx'
import { ProposalWorkspace } from '@/components/selection/ProposalWorkspace.tsx'
import { SubmissionResultModal } from '@/components/submissions/SubmissionResultModal.tsx'
import { SelectionPdfForm } from '@/components/selection/SelectionPdfForm.tsx'
import { SelectionPdfPreview } from '@/components/selection/SelectionPdfPreview.tsx'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import {
  createRequestProject,
  syncRequestProjectSelection,
  submitRequestProject,
  updateRequestProject,
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

type SelectionPdfFlowProps = {
  onClose: () => void
  isDetached: boolean
  onStartProcessing: () => void
  onRestoreAfterError: () => void
  activeProjectId: string | null
  activeProject: RequestProject | null
  draftProjects: RequestProject[]
  isLoadingProjects: boolean
  onProjectSelectionChange: (projectId: string | null) => void
  onPersistedProjectChange: (projectId: string) => void
  onProjectsRefresh: () => Promise<void>
}

const initialValues: SelectionPdfFormValues = {
  product: '',
  productionCompany: '',
  locationManager: '',
  email: '',
  tentativeStartDate: '',
  tentativeEndDate: '',
}

export function SelectionPdfFlow(props: SelectionPdfFlowProps) {
  const {
    onClose,
    isDetached,
    onStartProcessing,
    onRestoreAfterError,
    activeProjectId,
    activeProject,
    draftProjects,
    isLoadingProjects,
    onProjectSelectionChange,
    onPersistedProjectChange,
    onProjectsRefresh,
  } = props
  const navigate = useNavigate()
  const { images, clearSelection } = useImageSelection()
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
  const [isLoadingModalOpen, setIsLoadingModalOpen] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)

  const livePreviewPayload = useMemo(
    () => buildSelectionPdfPayloadFromImages(values, images),
    [images, values],
  )

  const hasSelectedImages = images.length > 0

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

  async function persistProposalDraft() {
    const nextErrors = validateSelectionPdfForm(values)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setDraftNotice(null)
      return null
    }

    setErrors({})
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
        const createdProject = await createRequestProject(draftPayload)
        projectId = createdProject.id
        created = true
        setCreatedProjectId(projectId)
        onPersistedProjectChange(projectId)
      } else {
        await updateRequestProject(projectId, draftPayload)
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
    await persistProposalDraft()
  }

  async function handleSubmitProposal() {
    setExportError(null)
    setExportResult(null)
    setFailedImages([])
    setProgress(null)

    try {
      const draftResult = await persistProposalDraft()

      if (!draftResult || !hasSelectedImages) {
        return
      }

      const payload: SelectionPdfPayload = livePreviewPayload
      setProjectSavedBeforeError(true)
      setStep('generating')
      setIsLoadingModalOpen(true)
      onStartProcessing()

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
      await submitRequestProject(draftResult.projectId)
      setExportResult(result)
      setFailedImages(result.failedImages)
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
    }
  }

  function handleSuccessModalClose() {
    setIsSuccessModalOpen(false)
    onClose()
    navigate('/requests')
  }

  return (
    <>
      {!isDetached ? (
        <ProposalWorkspace
          preview={<SelectionPdfPreview payload={livePreviewPayload} />}
          sidebarTitle="Datos del proyecto"
          sidebarHeader={
            <div className="min-w-0">
              <p className="mb-3 font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
                Proyecto actual
              </p>
              <ActiveProjectSelect
                activeProjectId={activeProjectId}
                projects={draftProjects}
                isLoading={isLoadingProjects}
                onChange={onProjectSelectionChange}
              />
              {livePreviewPayload.totalLocations > 0 ? (
                <p className="mt-3 text-sm text-brand-300">
                  {livePreviewPayload.totalLocations}{' '}
                  {livePreviewPayload.totalLocations === 1
                    ? 'locacion guardada'
                    : 'locaciones guardadas'}
                </p>
              ) : null}
            </div>
          }
          sidebarBody={
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
                columns={2}
              />
            </div>
          }
          sidebarFooter={
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void handleSaveDraft()
                }}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Guardar borrador
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleSubmitProposal()
                }}
                disabled={!hasSelectedImages}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                Enviar propuesta
              </button>
            </div>
          }
          onClose={onClose}
        />
      ) : step !== 'form' ? (
          <aside className="ml-auto flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#14110f] shadow-[-16px_0_48px_rgba(0,0,0,0.32)] sm:w-[min(92vw,460px)]">
            <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                  {step === 'generating'
                    ? 'Guardando propuesta'
                    : step === 'success'
                      ? 'Propuesta guardada'
                      : 'No pudimos completar la propuesta'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={step === 'generating' || isSuccessModalOpen}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                aria-label="Cerrar flujo de preparacion"
                autoFocus
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {step === 'generating' ? (
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
              ) : step === 'success' ? (
                <div className="space-y-6">
                  <div className="rounded-[1.5rem] border border-brand-300/25 bg-brand-300/10 p-5">
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                      El proyecto y el PDF se generaron correctamente
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-brand-300">
                      {failedImages.length > 0
                        ? 'El proyecto se guardo y el PDF se genero, pero algunas imagenes no pudieron incluirse.'
                        : 'La propuesta se guardo y el documento se genero con todas las imagenes disponibles.'}
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

                  <button
                    type="button"
                    onClick={() => {
                      setStep('form')
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/12 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                  >
                    Volver al formulario
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-[1.5rem] border border-red-300/30 bg-red-200/10 p-5">
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                      No pudimos completar la propuesta
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-red-100">
                      {projectSavedBeforeError
                        ? `El proyecto se guardo correctamente, pero no pudimos descargar el PDF.${exportError ? ` ${exportError}` : ''}`
                        : exportError ?? 'Ocurrio un problema durante la generacion.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('form')
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                  >
                    Editar datos
                  </button>
                </div>
              )}
            </div>
          </aside>
      ) : null}

      {isLoadingModalOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="proposal-loading-title"
            aria-describedby="proposal-loading-description"
            className="w-full max-w-md rounded-[1rem] border border-white/10 bg-[#1B1B1D] p-6 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-7"
          >
            <div className="flex flex-col items-center text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-300/30 bg-brand-300/10"
                aria-hidden="true"
              >
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-brand-300/25 border-t-brand-300" />
              </div>

              <h2
                id="proposal-loading-title"
                className="mt-5 font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
              >
                Generando propuesta...
              </h2>

              <p
                id="proposal-loading-description"
                className="mt-3 text-sm leading-6 text-brand-100/68 sm:text-base"
              >
                Estamos guardando tu proyecto y preparando el PDF.
              </p>

              <p aria-live="polite" className="mt-4 text-sm font-medium text-brand-300">
                {progress
                  ? `Procesando imagen ${progress.current} de ${progress.total}${progress.locationCode ? ` · ${progress.locationCode}` : ''}`
                  : createdProjectId
                    ? 'Proyecto guardado. Preparando el documento.'
                    : 'Creando el proyecto y preparando el documento.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <SubmissionResultModal
        isOpen={isSuccessModalOpen}
        variant="success"
        title="Proyecto creado correctamente"
        description="El proyecto fue guardado y el PDF se descargó correctamente."
        primaryActionLabel="Ir a Mis proyectos"
        onPrimaryAction={handleSuccessModalClose}
        onClose={handleSuccessModalClose}
      />
    </>
  )
}

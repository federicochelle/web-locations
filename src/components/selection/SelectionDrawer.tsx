import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { ActiveProjectSelect } from '@/components/selection/ActiveProjectSelect.tsx'
import { SelectedLocationGroup } from '@/components/selection/SelectedLocationGroup.tsx'
import { SELECTION_DRAWER_TRIGGER_ID } from '@/components/selection/SelectionDrawerTrigger.tsx'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import {
  getRequestProjectLocations,
  syncRequestProjectSelection,
} from '@/services/request-projects.service.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import type { RequestProjectLocation } from '@/types/request-project.ts'

const SelectionPdfFlow = lazy(() =>
  import('@/components/selection/SelectionPdfFlow.tsx').then((module) => ({
    default: module.SelectionPdfFlow,
  })),
)

type GroupedSelection = {
  locationId: string
  locationCode: string
  locationTitle: string
  categorySlug: string
  images: SelectedLocationImage[]
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
  const groupedSelections = new Map<string, GroupedSelection>()

  for (const image of images) {
    const existingGroup = groupedSelections.get(image.locationId)

    if (existingGroup) {
      existingGroup.images.push(image)
      continue
    }

    groupedSelections.set(image.locationId, {
      locationId: image.locationId,
      locationCode: image.locationCode,
      locationTitle: image.locationTitle,
      categorySlug: image.categorySlug,
      images: [image],
    })
  }

  return [...groupedSelections.values()].map((group) => ({
    ...group,
    images: sortGroupImages(group.images),
  }))
}

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

function ProposalPreviewIcon() {
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
      <path d="M4.75 12s2.9-5.25 7.25-5.25S19.25 12 19.25 12 16.35 17.25 12 17.25 4.75 12 4.75 12Z" />
      <circle cx="12" cy="12" r="2.35" />
    </svg>
  )
}

export function SelectionDrawer() {
  const {
    images,
    isDrawerOpen,
    closeDrawer,
    removeImage,
    clearSelection,
    replaceSelection,
  } = useImageSelection()
  const { draftProjects, isLoading, refreshProjects } = useRequestProjects()
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerPanelRef = useRef<HTMLDivElement | null>(null)
  const [activeView, setActiveView] = useState<'selection' | 'pdf-flow'>('selection')
  const [isRendered, setIsRendered] = useState(isDrawerOpen)
  const [isVisible, setIsVisible] = useState(isDrawerOpen)
  const [isPdfFlowDetached, setIsPdfFlowDetached] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [isLoadingProjectContent, setIsLoadingProjectContent] = useState(false)
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [draftSaveError, setDraftSaveError] = useState<string | null>(null)

  const groupedSelections = useMemo(
    () => groupImagesByLocation(images),
    [images],
  )
  const activeProject =
    draftProjects.find((project) => project.id === activeProjectId) ?? null

  function focusTriggerButton() {
    const trigger = document.getElementById(SELECTION_DRAWER_TRIGGER_ID)

    if (trigger instanceof HTMLButtonElement) {
      trigger.focus()
    }
  }

  function resetSelectionFlow() {
    clearSelection()
    setActiveView('selection')
    setIsPdfFlowDetached(false)
    setProjectLoadError(null)
    setDraftNotice(null)
    setDraftSaveError(null)
  }

  function forceCloseDrawerWithCleanup() {
    resetSelectionFlow()
    setActiveProjectId(null)
    setIsVisible(false)
    setIsRendered(false)
    closeDrawer()
    focusTriggerButton()
  }

  useEffect(() => {
    if (!activeProjectId || activeProject || isPdfFlowDetached) {
      return
    }

    resetSelectionFlow()
    setActiveProjectId(null)
  }, [activeProject, activeProjectId, isPdfFlowDetached])

  useEffect(() => {
    if (!isRendered) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDrawer()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDrawer, isRendered])

  useEffect(() => {
    let frameId = 0
    let nestedFrameId = 0
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isDrawerOpen) {
      setIsRendered(true)
      setIsVisible(false)
      frameId = window.requestAnimationFrame(() => {
        nestedFrameId = window.requestAnimationFrame(() => {
          setIsVisible(true)
        })
      })
      return () => {
        window.cancelAnimationFrame(frameId)
        window.cancelAnimationFrame(nestedFrameId)
      }
    }

    setIsVisible(false)

    if (isPdfFlowDetached) {
      setIsRendered(false)
      setActiveView('selection')
      setIsPdfFlowDetached(false)
      focusTriggerButton()
      return () => {
        window.cancelAnimationFrame(frameId)
      }
    }

    if (prefersReducedMotion) {
      setIsRendered(false)
      setActiveView('selection')
      setIsPdfFlowDetached(false)
      focusTriggerButton()
    }

    return () => {
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(nestedFrameId)
    }
  }, [isDrawerOpen, isPdfFlowDetached])

  useEffect(() => {
    if (!isRendered || !isVisible) {
      return
    }

    closeButtonRef.current?.focus()
  }, [isRendered, isVisible])

  function handleExitComplete() {
    if (isDrawerOpen) {
      return
    }

    setIsRendered(false)
    setActiveView('selection')
    setIsPdfFlowDetached(false)
    focusTriggerButton()
  }

  if (!isRendered) {
    return null
  }

  function handleRemoveLocation(locationId: string) {
    for (const image of images) {
      if (image.locationId === locationId) {
        removeImage(image.key)
      }
    }
  }

  function buildProjectFallbackImage(location: RequestProjectLocation): SelectedLocationImage {
    const imageUrl =
      location.location.coverImageUrl ??
      `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#201712"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#F3E8D2" font-family="Georgia, serif" font-size="54">${location.location.locationCode}</text></svg>`,
      )}`

    return {
      key: `${location.location.id}:project-cover`,
      imageUrl,
      locationImageId: null,
      sortOrder: location.sortOrder,
      locationId: location.location.id,
      locationCode: location.location.locationCode,
      locationTitle: location.location.title,
      categorySlug: location.location.categorySlug ?? '',
      selectedAt: location.createdAt,
    }
  }

  function buildProjectSelectionImages(location: RequestProjectLocation): SelectedLocationImage[] {
    if (location.selectedImages.length === 0) {
      return [buildProjectFallbackImage(location)]
    }

    return location.selectedImages.map((image) => ({
      key: `${location.location.id}:${image.locationImageId ?? image.imageUrl}:${image.id}`,
      imageUrl: image.imageUrl,
      locationImageId: image.locationImageId,
      sortOrder: image.sortOrder,
      locationId: location.location.id,
      locationCode: location.location.locationCode,
      locationTitle: location.location.title,
      categorySlug: location.location.categorySlug ?? '',
      selectedAt: image.createdAt,
    }))
  }

  async function loadProjectSelection(projectId: string) {
    const projectLocations = await getRequestProjectLocations(projectId)

    replaceSelection(
      projectLocations.flatMap((location) => buildProjectSelectionImages(location)),
    )
  }

  async function handleActiveProjectChange(projectId: string | null) {
    if (projectId === activeProjectId) {
      return
    }

    const hasPendingState = images.length > 0 || activeView === 'pdf-flow'

    if (
      hasPendingState &&
      !window.confirm(
        'Si cambias de proyecto se descartaran la seleccion actual y los datos sin guardar. ¿Quieres continuar?',
      )
    ) {
      return
    }

    if (projectId === null) {
      resetSelectionFlow()
      setActiveProjectId(null)
      return
    }

    try {
      setIsLoadingProjectContent(true)
      resetSelectionFlow()
      await loadProjectSelection(projectId)
      setActiveProjectId(projectId)
    } catch (error) {
      resetSelectionFlow()
      setActiveProjectId(null)
      setProjectLoadError(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar el proyecto seleccionado.',
      )
    } finally {
      setIsLoadingProjectContent(false)
    }
  }

  function handlePersistedProjectChange(projectId: string) {
    setActiveProjectId(projectId)
  }

  async function handleSaveDraftSelection() {
    if (!activeProjectId || images.length === 0) {
      return
    }

    try {
      setIsSavingDraft(true)
      setDraftSaveError(null)
      setDraftNotice(null)
      await syncRequestProjectSelection(activeProjectId, images)
      await refreshProjects()
      setDraftNotice('Borrador guardado.')
    } catch (error) {
      setDraftSaveError(
        error instanceof Error ? error.message : 'No pudimos guardar el borrador.',
      )
    } finally {
      setIsSavingDraft(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      {!isPdfFlowDetached ? (
        <button
          type="button"
          aria-label="Cerrar seleccion de imagenes"
          className={`absolute inset-0 bg-[#14110f]/72 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:duration-0 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeDrawer}
        />
      ) : null}
      {activeView === 'selection' ? (
        <aside
          id="selection-drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="selection-drawer-title"
          ref={drawerPanelRef}
          onTransitionEnd={(event) => {
            if (event.target !== drawerPanelRef.current) {
              return
            }

            handleExitComplete()
          }}
          className={`absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col border-l border-white/10 bg-[#14110f] text-brand-100 shadow-[-16px_0_48px_rgba(0,0,0,0.32)] transition-transform duration-300 ease-out motion-reduce:duration-0 sm:w-[min(92vw,460px)] ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <>
            <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <span id="selection-drawer-title" className="sr-only">
                  Editor de propuesta
                </span>
                <div className="mb-3 flex min-h-11 items-center">
                  <p className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
                    Proyecto actual
                  </p>
                </div>
                <ActiveProjectSelect
                  activeProjectId={activeProjectId}
                  projects={draftProjects}
                  isLoading={isLoading || isLoadingProjectContent}
                  compact
                  onChange={(projectId) => {
                    void handleActiveProjectChange(projectId)
                  }}
                />
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                aria-label="Cerrar drawer de seleccion"
              >
                ×
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {projectLoadError ? (
                <div className="mb-4 rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {projectLoadError}
                </div>
              ) : null}
              {draftSaveError ? (
                <div className="mb-4 rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {draftSaveError}
                </div>
              ) : null}
              {draftNotice ? (
                <div className="mb-4 rounded-[0.875rem] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                  {draftNotice}
                </div>
              ) : null}

              {isLoadingProjectContent ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-brand-100">
                    Cargando proyecto...
                  </div>
                </div>
              ) : groupedSelections.length > 0 ? (
                <div className="space-y-4">
                  {groupedSelections.map((group) => (
                    <SelectedLocationGroup
                      key={group.locationId}
                      locationId={group.locationId}
                      locationCode={group.locationCode}
                      categorySlug={group.categorySlug}
                      locationTitle={group.locationTitle}
                      images={group.images}
                      onNavigate={closeDrawer}
                      onRemoveLocation={handleRemoveLocation}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                  <div className="max-w-sm">
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-brand-100">
                      Tu seleccion esta vacia
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-brand-300">
                      Guarda imagenes desde las locaciones para revisarlas aqui mientras navegas.
                    </p>
                    <Link
                      to="/#explorar"
                      onClick={closeDrawer}
                      className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                    >
                      Explorar locaciones
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {images.length > 0 ? (
              <footer className="border-t border-white/10 px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row">
                  {activeProjectId ? (
                    <button
                      type="button"
                      onClick={() => {
                        void handleSaveDraftSelection()
                      }}
                      disabled={isSavingDraft}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
                    >
                      <DraftSaveIcon />
                      {isSavingDraft ? 'Guardando...' : 'Guardar borrador'}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('pdf-flow')
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-brand-300 px-5 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
                  >
                    <ProposalPreviewIcon />
                    Continuar
                  </button>
                </div>
              </footer>
            ) : null}
          </>
        </aside>
      ) : (
        <div
          id="selection-drawer"
          role={isPdfFlowDetached ? undefined : 'dialog'}
          aria-modal={isPdfFlowDetached ? undefined : true}
          aria-labelledby={isPdfFlowDetached ? undefined : 'selection-drawer-title'}
          ref={drawerPanelRef}
          onTransitionEnd={(event) => {
            if (event.target !== drawerPanelRef.current) {
              return
            }

            handleExitComplete()
          }}
          className={
            isPdfFlowDetached
              ? 'absolute inset-0'
              : `absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:duration-0 ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`
          }
        >
          <Suspense
            fallback={
              <div className="flex h-full flex-col lg:flex-row">
                <div className="hidden min-w-0 flex-1 lg:block" />
                <div className="flex h-full w-full items-center justify-center border-l border-white/10 bg-[#14110f] px-4 py-10 lg:w-[min(100%,460px)]">
                  <div className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-brand-100">
                    Cargando...
                  </div>
                </div>
              </div>
            }
          >
            <SelectionPdfFlow
              onClose={closeDrawer}
              onSuccessComplete={forceCloseDrawerWithCleanup}
              isDetached={isPdfFlowDetached}
              onStartProcessing={() => {
                setIsPdfFlowDetached(true)
              }}
              onRestoreAfterError={() => {
                setIsPdfFlowDetached(false)
              }}
              activeProjectId={activeProjectId}
              activeProject={activeProject}
              draftProjects={draftProjects}
              isLoadingProjects={isLoading}
              onProjectSelectionChange={handleActiveProjectChange}
              onPersistedProjectChange={handlePersistedProjectChange}
              onProjectsRefresh={refreshProjects}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}

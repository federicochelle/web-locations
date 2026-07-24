import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import {
  persistSelectionActiveContext,
  restoreSelectionActiveContext,
} from '@/utils/selection-active-context-storage.ts'

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

function createSelectionSnapshot(selectionImages: SelectedLocationImage[]) {
  return JSON.stringify(
    selectionImages.map((image) => ({
      key: image.key,
      locationId: image.locationId,
      locationImageId: image.locationImageId ?? null,
      sortOrder: image.sortOrder,
    })),
  )
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
  const {
    draftProjects,
    hasLoadedOnce,
    isLoading,
    refreshProjects,
  } = useRequestProjects()
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerPanelRef = useRef<HTMLDivElement | null>(null)
  const [activeView, setActiveView] = useState<'selection' | 'pdf-flow'>('selection')
  const [isRendered, setIsRendered] = useState(isDrawerOpen)
  const [isVisible, setIsVisible] = useState(isDrawerOpen)
  const [isPdfFlowDetached, setIsPdfFlowDetached] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [isLoadingProjectContent, setIsLoadingProjectContent] = useState(false)
  const [isHydratingPersistedContext, setIsHydratingPersistedContext] = useState(() => {
    const restoredContext = restoreSelectionActiveContext()
    return restoredContext?.mode === 'project'
  })
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)
  const [isPdfFlowBusy, setIsPdfFlowBusy] = useState(false)
  const autosaveTimeoutRef = useRef<number | null>(null)
  const autosaveExecutionTokenRef = useRef<symbol | null>(null)
  const autosavePromiseRef = useRef<Promise<boolean> | null>(null)
  const autosaveRequestVersionRef = useRef(0)
  const lastQueuedSnapshotRef = useRef<string | null>(null)
  const lastPersistedSnapshotRef = useRef<string | null>(null)
  const activeProjectIdRef = useRef<string | null>(null)
  const hydrationRequestIdRef = useRef(0)
  const activeHydrationProjectIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)
  const persistedContextRef = useRef(restoreSelectionActiveContext())

  const groupedSelections = useMemo(
    () => groupImagesByLocation(images),
    [images],
  )
  const activeProject =
    draftProjects.find((project) => project.id === activeProjectId) ?? null

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId
  }, [activeProjectId])

  const focusTriggerButton = useCallback(() => {
    const trigger = document.getElementById(SELECTION_DRAWER_TRIGGER_ID)

    if (trigger instanceof HTMLButtonElement) {
      trigger.focus()
    }
  }, [])

  const resetSelectionFlow = useCallback(() => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    clearSelection()
    setActiveView('selection')
    setIsPdfFlowDetached(false)
    setProjectLoadError(null)
    setDraftNotice(null)
    lastQueuedSnapshotRef.current = null
    lastPersistedSnapshotRef.current = null
  }, [clearSelection])

  const fetchProjectSelection = useCallback(async (projectId: string) => {
    const projectLocations = await getRequestProjectLocations(projectId)
    return projectLocations.flatMap((location) => buildProjectSelectionImages(location))
  }, [])

  const applyProjectSelection = useCallback((nextSelection: SelectedLocationImage[]) => {
    const selectionSnapshot = createSelectionSnapshot(nextSelection)
    lastQueuedSnapshotRef.current = selectionSnapshot
    lastPersistedSnapshotRef.current = selectionSnapshot
    replaceSelection(nextSelection)
  }, [replaceSelection])

  const runSelectionAutosave = useCallback((
    projectId: string,
    selectionImages: SelectedLocationImage[],
    requestVersion: number,
    showError = false,
  ) => {
    const selectionSnapshot = createSelectionSnapshot(selectionImages)
    const autosaveExecutionToken = Symbol('selection-autosave')
    const autosavePromise = (async () => {
      try {
        await syncRequestProjectSelection(projectId, selectionImages)
        await refreshProjects()

        const isLatestRequest =
          autosaveRequestVersionRef.current === requestVersion &&
          activeProjectIdRef.current === projectId

        if (!isLatestRequest) {
          return false
        }

        lastPersistedSnapshotRef.current = selectionSnapshot
        return true
      } catch (error) {
        const isLatestRequest =
          autosaveRequestVersionRef.current === requestVersion &&
          activeProjectIdRef.current === projectId

        if (isLatestRequest) {
          lastQueuedSnapshotRef.current = lastPersistedSnapshotRef.current

          if (showError) {
            setProjectLoadError(
              error instanceof Error
                ? error.message
                : 'No pudimos guardar la seleccion actual del proyecto.',
            )
          }
        }

        return false
      } finally {
        if (autosaveExecutionTokenRef.current === autosaveExecutionToken) {
          autosaveExecutionTokenRef.current = null
          autosavePromiseRef.current = null
        }
      }
    })()

    autosaveExecutionTokenRef.current = autosaveExecutionToken
    autosavePromiseRef.current = autosavePromise
    return autosavePromise
  }, [refreshProjects])

  const flushSelectionAutosaveBeforeProjectChange = useCallback(async () => {
    if (!activeProjectIdRef.current) {
      return true
    }

    const currentSelectionSnapshot = createSelectionSnapshot(images)
    const hasUnsavedSelection =
      currentSelectionSnapshot !== lastPersistedSnapshotRef.current

    if (!hasUnsavedSelection) {
      return true
    }

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
      setProjectLoadError(null)

      const requestVersion = autosaveRequestVersionRef.current + 1
      autosaveRequestVersionRef.current = requestVersion

      return runSelectionAutosave(
        activeProjectIdRef.current,
        images,
        requestVersion,
        true,
      )
    }

    if (autosavePromiseRef.current) {
      const didPersistCurrentSelection = await autosavePromiseRef.current

      if (didPersistCurrentSelection) {
        return true
      }
    }

    setProjectLoadError(null)

    const requestVersion = autosaveRequestVersionRef.current + 1
    autosaveRequestVersionRef.current = requestVersion

    return runSelectionAutosave(
      activeProjectIdRef.current,
      images,
      requestVersion,
      true,
    )
  }, [images, runSelectionAutosave])

  function forceCloseDrawerWithCleanup() {
    hydrationRequestIdRef.current += 1
    activeHydrationProjectIdRef.current = null
    resetSelectionFlow()
    setActiveProjectId(null)
    setIsLoadingProjectContent(false)
    setIsHydratingPersistedContext(false)
    persistSelectionActiveContext({ mode: 'new' })
    persistedContextRef.current = { mode: 'new' }
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
    persistSelectionActiveContext({ mode: 'new' })
    persistedContextRef.current = { mode: 'new' }
  }, [activeProject, activeProjectId, isPdfFlowDetached, resetSelectionFlow])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      hydrationRequestIdRef.current += 1
      activeHydrationProjectIdRef.current = null

      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const persistedContext = persistedContextRef.current

    if (!isHydratingPersistedContext || persistedContext?.mode !== 'project') {
      return
    }

    if (!hasLoadedOnce || isLoading) {
      return
    }

    const persistedProject = draftProjects.find(
      (project) => project.id === persistedContext.projectId,
    )

    if (!persistedProject) {
      resetSelectionFlow()
      setActiveProjectId(null)
      persistSelectionActiveContext({ mode: 'new' })
      persistedContextRef.current = { mode: 'new' }
      activeHydrationProjectIdRef.current = null
      setIsLoadingProjectContent(false)
      setIsHydratingPersistedContext(false)
      return
    }

    const persistedProjectId = persistedProject.id

    if (activeHydrationProjectIdRef.current === persistedProjectId) {
      return
    }

    const requestId = hydrationRequestIdRef.current + 1
    hydrationRequestIdRef.current = requestId
    activeHydrationProjectIdRef.current = persistedProjectId

    async function restorePersistedProjectSelection() {
      try {
        setIsLoadingProjectContent(true)
        setProjectLoadError(null)
        resetSelectionFlow()
        setActiveProjectId(persistedProjectId)
        const nextSelection = await fetchProjectSelection(persistedProjectId)

        if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
          return
        }

        applyProjectSelection(nextSelection)
      } catch (error) {
        if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
          return
        }

        resetSelectionFlow()
        setActiveProjectId(null)
        persistSelectionActiveContext({ mode: 'new' })
        persistedContextRef.current = { mode: 'new' }
        setProjectLoadError(
          error instanceof Error
            ? error.message
            : 'No pudimos cargar el proyecto seleccionado.',
        )
      } finally {
        const isCurrentHydration =
          isMountedRef.current && hydrationRequestIdRef.current === requestId

        if (isCurrentHydration) {
          activeHydrationProjectIdRef.current = null
          setIsLoadingProjectContent(false)
          setIsHydratingPersistedContext(false)
        }
      }
    }

    void restorePersistedProjectSelection()
  }, [
    applyProjectSelection,
    draftProjects,
    fetchProjectSelection,
    hasLoadedOnce,
    isHydratingPersistedContext,
    isLoading,
    resetSelectionFlow,
  ])

  useEffect(() => {
    if (!activeProjectId || isLoadingProjectContent) {
      return
    }

    const selectionSnapshot = createSelectionSnapshot(images)

    if (lastQueuedSnapshotRef.current === selectionSnapshot) {
      return
    }

    lastQueuedSnapshotRef.current = selectionSnapshot
    setDraftNotice(null)

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
    }

    const requestVersion = autosaveRequestVersionRef.current + 1
    autosaveRequestVersionRef.current = requestVersion
    const projectIdAtSchedule = activeProjectId
    const imagesAtSchedule = images

    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null

      void runSelectionAutosave(projectIdAtSchedule, imagesAtSchedule, requestVersion)
    }, 600)
  }, [activeProjectId, images, isLoadingProjectContent, runSelectionAutosave])

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
  }, [focusTriggerButton, isDrawerOpen, isPdfFlowDetached])

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

  async function handleActiveProjectChange(projectId: string | null) {
    if (projectId === activeProjectId) {
      return
    }

    const isInPdfFlow = activeView === 'pdf-flow'
    const isWorkingInNewSelection = activeProjectId === null && images.length > 0
    const shouldConfirmDiscard =
      isInPdfFlow || isWorkingInNewSelection

    if (
      shouldConfirmDiscard &&
      !window.confirm(
        'Si cambias de proyecto se descartaran la seleccion actual y los datos sin guardar. ¿Quieres continuar?',
      )
    ) {
      return
    }

    if (!isInPdfFlow && activeProjectId) {
      setIsLoadingProjectContent(true)
      const didPersistPendingSelection = await flushSelectionAutosaveBeforeProjectChange()

      if (!didPersistPendingSelection) {
        setIsLoadingProjectContent(false)
        return
      }
    }

    if (projectId === null) {
      hydrationRequestIdRef.current += 1
      activeHydrationProjectIdRef.current = null
      resetSelectionFlow()
      setActiveProjectId(null)
      setIsLoadingProjectContent(false)
      setIsHydratingPersistedContext(false)
      persistSelectionActiveContext({ mode: 'new' })
      persistedContextRef.current = { mode: 'new' }
      return
    }

    const requestId = hydrationRequestIdRef.current + 1
    hydrationRequestIdRef.current = requestId
    activeHydrationProjectIdRef.current = projectId

    try {
      setIsLoadingProjectContent(true)
      setIsHydratingPersistedContext(false)
      resetSelectionFlow()
      setActiveProjectId(projectId)
      const nextSelection = await fetchProjectSelection(projectId)

      if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
        return
      }

      applyProjectSelection(nextSelection)
      persistSelectionActiveContext({ mode: 'project', projectId })
      persistedContextRef.current = { mode: 'project', projectId }
    } catch (error) {
      if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
        return
      }

      resetSelectionFlow()
      setActiveProjectId(null)
      persistSelectionActiveContext({ mode: 'new' })
      persistedContextRef.current = { mode: 'new' }
      setProjectLoadError(
        error instanceof Error
          ? error.message
          : 'No pudimos cargar el proyecto seleccionado.',
      )
    } finally {
      const isCurrentProjectLoad =
        isMountedRef.current && hydrationRequestIdRef.current === requestId

      if (isCurrentProjectLoad) {
        activeHydrationProjectIdRef.current = null
        setIsLoadingProjectContent(false)
      }
    }
  }

  function handlePersistedProjectChange(projectId: string) {
    setActiveProjectId(projectId)
    persistSelectionActiveContext({ mode: 'project', projectId })
    persistedContextRef.current = { mode: 'project', projectId }
  }

  function renderDrawerHeader() {
    return (
      <header className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span id="selection-drawer-title" className="sr-only">
              Editor de propuesta
            </span>
            <div className="mb-3 flex min-h-11 items-center">
              <p className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
                Seleccionar proyecto
              </p>
            </div>
            <ActiveProjectSelect
              activeProjectId={activeProjectId}
              projects={draftProjects}
              isLoading={isLoading || isLoadingProjectContent}
              disabled={activeView === 'pdf-flow' ? isPdfFlowBusy : false}
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
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
            aria-label="Cerrar drawer de seleccion"
          >
            ×
          </button>
        </div>
      </header>
    )
  }

  return (
    <div className="fixed inset-0 z-40 overscroll-none">
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
          className={`absolute right-0 top-0 flex h-screen max-h-screen min-h-0 w-full max-w-[460px] flex-col overflow-hidden border-l border-white/10 bg-[#14110f] text-brand-100 shadow-[-16px_0_48px_rgba(0,0,0,0.32)] transition-transform duration-300 ease-out motion-reduce:duration-0 supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh] sm:w-[min(92vw,460px)] ${
            isVisible ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {renderDrawerHeader()}

          <>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {projectLoadError ? (
                <div className="mb-4 rounded-[0.875rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {projectLoadError}
                </div>
              ) : null}
              {draftNotice ? (
                <div className="mb-4 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-100">
                  {draftNotice}
                </div>
              ) : null}

              {isLoadingProjectContent || isHydratingPersistedContext ? (
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
              <footer className="shrink-0 border-t border-white/10 px-4 py-4 sm:px-5">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveView('pdf-flow')
                      setIsPdfFlowDetached(true)
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
              : `absolute right-0 top-0 flex h-screen max-h-screen min-h-0 w-full max-w-[460px] flex-col overflow-hidden border-l border-white/10 bg-[#14110f] text-brand-100 shadow-[-16px_0_48px_rgba(0,0,0,0.32)] transition-transform duration-300 ease-out motion-reduce:duration-0 supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh] sm:w-[min(92vw,460px)] ${
                  isVisible ? 'translate-x-0' : 'translate-x-full'
                }`
          }
        >
          {!isPdfFlowDetached ? renderDrawerHeader() : null}

          <Suspense
            fallback={
              <div
                className={
                  isPdfFlowDetached
                    ? 'flex h-full flex-col lg:flex-row'
                    : 'flex h-full min-h-0 items-center justify-center px-4 py-10'
                }
              >
                {isPdfFlowDetached ? <div className="hidden min-w-0 flex-1 lg:block" /> : null}
                <div
                  className={
                    isPdfFlowDetached
                      ? 'flex h-screen max-h-screen min-h-0 w-full items-center justify-center border-l border-white/10 bg-[#14110f] px-4 py-10 supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh] lg:w-[min(100%,460px)]'
                      : ''
                  }
                >
                  <div className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-medium text-brand-100">
                    Cargando...
                  </div>
                </div>
              </div>
            }
          >
            <div className={isPdfFlowDetached ? 'h-full' : 'min-h-0 flex-1 overflow-hidden'}>
              <SelectionPdfFlow
                onClose={closeDrawer}
                onSuccessComplete={forceCloseDrawerWithCleanup}
                isDetached={isPdfFlowDetached}
                embeddedInDrawer={!isPdfFlowDetached}
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
                onBusyStateChange={setIsPdfFlowBusy}
              />
            </div>
          </Suspense>
        </div>
      )}
    </div>
  )
}

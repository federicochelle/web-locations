import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import drawerFooterBackgroundUrl from '@/assets/home-mosaic/WhatsApp Image 2026-07-27 at 9.08.39 PM (3).webp'
import { ActiveProjectSelect } from '@/components/selection/ActiveProjectSelect.tsx'
import { SelectionDrawerHeader } from '@/components/selection/SelectionDrawerHeader.tsx'
import { SelectedLocationGroup } from '@/components/selection/SelectedLocationGroup.tsx'
import { AppModal } from '@/components/ui/AppModal.tsx'
import { SELECTION_DRAWER_TRIGGER_ID } from '@/components/selection/SelectionDrawerTrigger.tsx'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { syncRequestProjectSelection } from '@/services/request-projects.service.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import {
  OPEN_SELECTION_PROJECT_EVENT,
  persistSelectionActiveContext,
  restoreSelectionActiveContext,
} from '@/utils/selection-active-context-storage.ts'
import { fetchProjectSelectionImages } from '@/utils/selection-project-images.ts'
import {
  beginSelectionProjectTransition,
  canPersistSelectionForProject,
  clearSelectionProjectPersistenceGuard,
  isSelectionProjectTransitioning,
  markSelectionProjectStable,
} from '@/utils/selection-persistence-guard.ts'

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

type DrawerProjectAutosaveIndicatorState = 'hidden' | 'saving' | 'saved' | 'error'
type DrawerInternalView = 'selection' | 'pdf-flow'
type DrawerViewTransition = {
  from: DrawerInternalView
  to: DrawerInternalView
  direction: 'forward' | 'backward'
}

const DRAWER_INTERNAL_VIEW_TRANSITION_MS = 300

const drawerFooterOverlayClassName =
  'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,4,4,0.32),rgba(5,4,4,0.4)_38%,rgba(5,4,4,0.5))]'

const drawerFooterHighlightClassName =
  'absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(215,192,162,0.16),transparent_26%),radial-gradient(circle_at_82%_22%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_50%_50%,transparent_58%,rgba(0,0,0,0.08)_100%)]'

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

  return [...groupedSelections.values()]
    .map((group) => ({
      ...group,
      images: sortGroupImages(group.images),
    }))
    .sort((left, right) =>
      left.locationCode.localeCompare(right.locationCode, 'es', {
        numeric: true,
        sensitivity: 'base',
      }),
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
      <path d="M4.75 11.75 18.5 5.5 14 19.25l-3.15-4.35-4.1-3.15Z" />
      <path d="m10.6 14.7 2.6-2.6" />
    </svg>
  )
}

function BackArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15.25 5.75 8.75 12l6.5 6.25" />
      <path d="M9.5 12h8.75" />
    </svg>
  )
}

export function SelectionDrawer() {
  const {
    activeProjectId: selectionProjectId,
    images,
    isDrawerOpen,
    closeDrawer,
    removeImage,
    clearSelection,
    replaceSelection,
  } = useImageSelection()
  const {
    activeEditingProjectId,
    finishProjectEditing,
    flushAndFinishProjectEditing,
    projects,
    hasLoadedOnce,
    isLoading,
    refreshProjects,
  } = useRequestProjects()
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerPanelRef = useRef<HTMLDivElement | null>(null)
  const [activeView, setActiveView] = useState<DrawerInternalView>('selection')
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
  const [isExitEditModalOpen, setIsExitEditModalOpen] = useState(false)
  const [pendingProjectIdAfterExit, setPendingProjectIdAfterExit] = useState<string | null | undefined>(undefined)
  const [projectAutosaveIndicator, setProjectAutosaveIndicator] =
    useState<DrawerProjectAutosaveIndicatorState>('hidden')
  const autosaveTimeoutRef = useRef<number | null>(null)
  const autosaveExecutionTokenRef = useRef<symbol | null>(null)
  const autosavePromiseRef = useRef<Promise<boolean> | null>(null)
  const autosaveRequestVersionRef = useRef(0)
  const lastQueuedSnapshotRef = useRef<string | null>(null)
  const lastPersistedSnapshotRef = useRef<string | null>(null)
  const hasHydratedActiveProjectSelectionRef = useRef(false)
  const isProjectTransitioningRef = useRef(false)
  const activeProjectIdRef = useRef<string | null>(null)
  const hydrationRequestIdRef = useRef(0)
  const activeHydrationProjectIdRef = useRef<string | null>(null)
  const isMountedRef = useRef(true)
  const persistedContextRef = useRef(restoreSelectionActiveContext())
  const projectFormFlushRef = useRef<(() => Promise<boolean>) | null>(null)
  const prefersReducedMotionRef = useRef(false)
  const viewTransitionTimeoutRef = useRef<number | null>(null)
  const [viewTransition, setViewTransition] = useState<DrawerViewTransition | null>(null)

  const groupedSelections = useMemo(
    () => groupImagesByLocation(images),
    [images],
  )
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null
  const selectableProjects = useMemo(
    () => projects.filter((project) =>
      project.status === 'draft' || project.id === activeEditingProjectId,
    ),
    [activeEditingProjectId, projects],
  )

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

    hasHydratedActiveProjectSelectionRef.current = false
    if (!activeProjectIdRef.current) {
      clearSelection()
    }
    setActiveView('selection')
    setIsPdfFlowDetached(false)
    setProjectLoadError(null)
    setDraftNotice(null)
    lastQueuedSnapshotRef.current = null
    lastPersistedSnapshotRef.current = null
  }, [clearSelection])

  const cancelPendingAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current)
      autosaveTimeoutRef.current = null
    }

    autosaveRequestVersionRef.current += 1
  }, [])

  const fetchProjectSelection = useCallback(async (projectId: string) => {
    return fetchProjectSelectionImages(projectId)
  }, [])

  const applyProjectSelection = useCallback((
    projectId: string,
    nextSelection: SelectedLocationImage[],
  ) => {
    const selectionSnapshot = createSelectionSnapshot(nextSelection)
    lastQueuedSnapshotRef.current = selectionSnapshot
    lastPersistedSnapshotRef.current = selectionSnapshot
    replaceSelection(nextSelection, { projectId })
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
        await syncRequestProjectSelection(projectId, selectionImages, {
          allowEmptySelection: false,
        })
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

    if (!hasHydratedActiveProjectSelectionRef.current) {
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
    isProjectTransitioningRef.current = false
    hasHydratedActiveProjectSelectionRef.current = false
    cancelPendingAutosave()
    clearSelectionProjectPersistenceGuard()
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

  function prepareForSubmittedProjectCleanup() {
    if (activeEditingProjectId) {
      finishProjectEditing(activeEditingProjectId)
    }

    isProjectTransitioningRef.current = false
    hasHydratedActiveProjectSelectionRef.current = false
    cancelPendingAutosave()
    clearSelectionProjectPersistenceGuard()
    hydrationRequestIdRef.current += 1
    activeHydrationProjectIdRef.current = null
    setActiveProjectId(null)
    setIsLoadingProjectContent(false)
    setIsHydratingPersistedContext(false)
    persistSelectionActiveContext({ mode: 'new' })
    persistedContextRef.current = { mode: 'new' }
  }

  useEffect(() => {
    if (
      !hasLoadedOnce ||
      isLoading ||
      !activeProjectId ||
      activeProject ||
      isPdfFlowDetached
    ) {
      return
    }

    resetSelectionFlow()
    setActiveProjectId(null)
    persistSelectionActiveContext({ mode: 'new' })
    persistedContextRef.current = { mode: 'new' }
  }, [
    activeProject,
    activeProjectId,
    hasLoadedOnce,
    isLoading,
    isPdfFlowDetached,
    resetSelectionFlow,
  ])

  useEffect(() => {
    const mediaQuery =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null

    if (!mediaQuery) {
      return
    }

    const updatePreference = () => {
      prefersReducedMotionRef.current = mediaQuery.matches
    }

    updatePreference()
    mediaQuery.addEventListener('change', updatePreference)

    return () => {
      mediaQuery.removeEventListener('change', updatePreference)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
      hydrationRequestIdRef.current += 1
      activeHydrationProjectIdRef.current = null

      if (autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current)
      }

      if (viewTransitionTimeoutRef.current !== null) {
        window.clearTimeout(viewTransitionTimeoutRef.current)
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

    const persistedProject = projects.find(
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
        isProjectTransitioningRef.current = true
        hasHydratedActiveProjectSelectionRef.current = false
        beginSelectionProjectTransition(persistedProjectId)
        cancelPendingAutosave()
        setIsLoadingProjectContent(true)
        setProjectLoadError(null)
        resetSelectionFlow()
        setActiveProjectId(persistedProjectId)
        const nextSelection = await fetchProjectSelection(persistedProjectId)

        if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
          return
        }

        applyProjectSelection(persistedProjectId, nextSelection)
        hasHydratedActiveProjectSelectionRef.current = true
        markSelectionProjectStable(persistedProjectId)
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
          isProjectTransitioningRef.current = false
          activeHydrationProjectIdRef.current = null
          setIsLoadingProjectContent(false)
          setIsHydratingPersistedContext(false)
        }
      }
    }

    void restorePersistedProjectSelection()
  }, [
    applyProjectSelection,
    cancelPendingAutosave,
    fetchProjectSelection,
    hasLoadedOnce,
    isHydratingPersistedContext,
    isLoading,
    projects,
    resetSelectionFlow,
  ])

  useEffect(() => {
    function handleOpenSelectionProject(event: Event) {
      const customEvent = event as CustomEvent<{ projectId?: string }>
      const projectId = customEvent.detail?.projectId?.trim()

      if (!projectId) {
        return
      }

      const requestId = hydrationRequestIdRef.current + 1
      hydrationRequestIdRef.current = requestId
      activeHydrationProjectIdRef.current = projectId

      void (async () => {
        try {
          if (activeProjectIdRef.current) {
            await flushSelectionAutosaveBeforeProjectChange()
          }

          isProjectTransitioningRef.current = true
          hasHydratedActiveProjectSelectionRef.current = false
          beginSelectionProjectTransition(projectId)
          cancelPendingAutosave()
          setIsLoadingProjectContent(true)
          setIsHydratingPersistedContext(false)
          setProjectLoadError(null)
          resetSelectionFlow()
          setActiveProjectId(projectId)
          const nextSelection = await fetchProjectSelection(projectId)

          if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
            return
          }

          applyProjectSelection(projectId, nextSelection)
          hasHydratedActiveProjectSelectionRef.current = true
          markSelectionProjectStable(projectId)
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
            isProjectTransitioningRef.current = false
            activeHydrationProjectIdRef.current = null
            setIsLoadingProjectContent(false)
          }
        }
      })()
    }

    window.addEventListener(
      OPEN_SELECTION_PROJECT_EVENT,
      handleOpenSelectionProject as EventListener,
    )

    return () => {
      window.removeEventListener(
        OPEN_SELECTION_PROJECT_EVENT,
        handleOpenSelectionProject as EventListener,
      )
    }
  }, [
    applyProjectSelection,
    cancelPendingAutosave,
    fetchProjectSelection,
    flushSelectionAutosaveBeforeProjectChange,
    resetSelectionFlow,
  ])

  useEffect(() => {
    if (
      !activeProjectId ||
      !hasHydratedActiveProjectSelectionRef.current ||
      isLoadingProjectContent ||
      isProjectTransitioningRef.current ||
      isSelectionProjectTransitioning() ||
      !canPersistSelectionForProject(activeProjectId)
    ) {
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

      if (
        isProjectTransitioningRef.current ||
        isSelectionProjectTransitioning() ||
        !canPersistSelectionForProject(projectIdAtSchedule) ||
        activeProjectIdRef.current !== projectIdAtSchedule ||
        autosaveRequestVersionRef.current !== requestVersion
      ) {
        return
      }

      void runSelectionAutosave(projectIdAtSchedule, imagesAtSchedule, requestVersion)
    }, 600)
  }, [activeProjectId, images, isLoadingProjectContent, runSelectionAutosave])

  useEffect(() => {
    if (selectionProjectId === activeProjectId) {
      return
    }

    setActiveProjectId(selectionProjectId)
  }, [activeProjectId, selectionProjectId])

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

  function transitionToView(nextView: DrawerInternalView) {
    if (nextView === activeView) {
      return
    }

    if (viewTransitionTimeoutRef.current !== null) {
      window.clearTimeout(viewTransitionTimeoutRef.current)
      viewTransitionTimeoutRef.current = null
    }

    if (prefersReducedMotionRef.current) {
      setViewTransition(null)
      setActiveView(nextView)
      return
    }

    const nextTransition: DrawerViewTransition = {
      from: activeView,
      to: nextView,
      direction: nextView === 'pdf-flow' ? 'forward' : 'backward',
    }

    setViewTransition(nextTransition)
    setActiveView(nextView)
    viewTransitionTimeoutRef.current = window.setTimeout(() => {
      viewTransitionTimeoutRef.current = null
      setViewTransition(null)
    }, DRAWER_INTERNAL_VIEW_TRANSITION_MS)
  }

  async function handleRemoveLocation(locationId: string) {
    const activeProjectIdToClear = activeProjectId
    const isRemovingLastLocation =
      Boolean(activeProjectIdToClear) &&
      groupedSelections.length === 1 &&
      groupedSelections[0]?.locationId === locationId

    if (isRemovingLastLocation) {
      if (!activeProjectIdToClear) {
        return
      }

      if (
        !window.confirm(
          'Esta accion quitara todas las locaciones del proyecto. ¿Quieres continuar?',
        )
      ) {
        return
      }

      try {
        setProjectLoadError(null)
        await syncRequestProjectSelection(activeProjectIdToClear, [], {
          allowEmptySelection: true,
        })
        await refreshProjects()
        const emptySelectionSnapshot = createSelectionSnapshot([])
        lastQueuedSnapshotRef.current = emptySelectionSnapshot
        lastPersistedSnapshotRef.current = emptySelectionSnapshot
      } catch (error) {
        setProjectLoadError(
          error instanceof Error
            ? error.message
            : 'No pudimos quitar las locaciones del proyecto.',
        )
        return
      }
    }

    for (const image of images) {
      if (image.locationId === locationId) {
        removeImage(image.key)
      }
    }
  }

  async function performActiveProjectChange(projectId: string | null) {
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

    if (projectFormFlushRef.current) {
      const didFlushProjectForm = await projectFormFlushRef.current()

      if (!didFlushProjectForm) {
        return
      }
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
      isProjectTransitioningRef.current = false
      hasHydratedActiveProjectSelectionRef.current = false
      cancelPendingAutosave()
      clearSelectionProjectPersistenceGuard()
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
      isProjectTransitioningRef.current = true
      hasHydratedActiveProjectSelectionRef.current = false
      beginSelectionProjectTransition(projectId)
      cancelPendingAutosave()
      setIsLoadingProjectContent(true)
      setIsHydratingPersistedContext(false)
      resetSelectionFlow()
      setActiveProjectId(projectId)
      const nextSelection = await fetchProjectSelection(projectId)

      if (!isMountedRef.current || hydrationRequestIdRef.current !== requestId) {
        return
      }

      applyProjectSelection(projectId, nextSelection)
      hasHydratedActiveProjectSelectionRef.current = true
      markSelectionProjectStable(projectId)
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
        isProjectTransitioningRef.current = false
        activeHydrationProjectIdRef.current = null
        setIsLoadingProjectContent(false)
      }
    }
  }

  async function handleActiveProjectChange(projectId: string | null) {
    if (
      activeEditingProjectId &&
      activeProjectId === activeEditingProjectId &&
      projectId !== activeEditingProjectId
    ) {
      setPendingProjectIdAfterExit(projectId)
      setIsExitEditModalOpen(true)
      return
    }

    await performActiveProjectChange(projectId)
  }

  function handlePersistedProjectChange(projectId: string) {
    setActiveProjectId(projectId)
    persistSelectionActiveContext({ mode: 'project', projectId })
    persistedContextRef.current = { mode: 'project', projectId }
  }

  function renderDrawerHeader() {
    return (
      <SelectionDrawerHeader
        closeAriaLabel="Cerrar drawer de seleccion"
        closeButtonRef={closeButtonRef}
        hiddenLabel="Editor de propuesta"
        hiddenLabelId="selection-drawer-title"
        leftContent={
          <div className="flex min-w-0 items-center gap-2.5">
            {activeView === 'selection' ? (
              <ActiveProjectSelect
                activeProjectId={activeProjectId}
                projects={selectableProjects}
                activeProject={activeProject}
                isLoading={isLoading || isLoadingProjectContent}
                disabled={false}
                compact
                onChange={(projectId) => {
                  void handleActiveProjectChange(projectId)
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  transitionToView('selection')
                }}
                disabled={isPdfFlowBusy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/8 px-3.5 text-sm font-medium text-brand-100 transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
              >
                <BackArrowIcon />
                <span>Volver</span>
              </button>
            )}
            <span
              aria-live="polite"
              aria-atomic="true"
              className="inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center"
            >
              {projectAutosaveIndicator === 'saving' ? (
                <span className="text-brand-300">
                  <AutosaveSpinnerIcon />
                </span>
              ) : null}
              {projectAutosaveIndicator === 'saved' ? (
                <span className="text-emerald-300">
                  <AutosaveCheckIcon />
                </span>
              ) : null}
              {projectAutosaveIndicator === 'error' ? (
                <span className="text-red-300">
                  <AutosaveErrorIcon />
                </span>
              ) : null}
            </span>
          </div>
        }
        onClose={closeDrawer}
      />
    )
  }

  function renderSelectionViewContent() {
    return (
      <div className="flex h-full min-h-0 flex-col">
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
          <footer className="relative shrink-0 overflow-hidden border-t border-white/10">
            <div className="absolute inset-0" aria-hidden="true">
              <img
                src={drawerFooterBackgroundUrl}
                alt=""
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-black/46" />
              <div className={drawerFooterOverlayClassName} />
              <div className={drawerFooterHighlightClassName} />
            </div>
            <div className="relative flex px-4 py-4 sm:px-5">
              <button
                type="button"
                onClick={() => {
                  transitionToView('pdf-flow')
                }}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/60 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-14px_32px_rgba(0,0,0,0.22),0_12px_26px_rgba(0,0,0,0.16)] transition hover:border-white/80 hover:bg-white/18 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-14px_32px_rgba(0,0,0,0.18),0_14px_28px_rgba(0,0,0,0.18)]"
              >
                <ProposalPreviewIcon />
                Continuar
              </button>
            </div>
          </footer>
        ) : null}
      </div>
    )
  }

  function renderPdfFlowViewContent() {
    return (
      <div className="h-full min-h-0 overflow-hidden">
        <SelectionPdfFlow
          onClose={closeDrawer}
          onSuccessComplete={forceCloseDrawerWithCleanup}
          onPrepareForSuccessCleanup={prepareForSubmittedProjectCleanup}
          isDetached={false}
          embeddedInDrawer
          onStartProcessing={() => {
            setIsPdfFlowDetached(true)
          }}
          onRestoreAfterError={() => {
            setIsPdfFlowDetached(false)
          }}
          activeProjectId={activeProjectId}
          activeProject={activeProject}
          draftProjects={selectableProjects}
          isLoadingProjects={isLoading}
          onProjectSelectionChange={handleActiveProjectChange}
          onPersistedProjectChange={handlePersistedProjectChange}
          onProjectsRefresh={refreshProjects}
          onBusyStateChange={setIsPdfFlowBusy}
          onRegisterProjectFormFlush={(handler) => {
            projectFormFlushRef.current = handler
          }}
          onAutosaveIndicatorChange={setProjectAutosaveIndicator}
        />
      </div>
    )
  }

  function renderDrawerInternalView(view: DrawerInternalView) {
    return view === 'selection'
      ? renderSelectionViewContent()
      : renderPdfFlowViewContent()
  }

  function getDrawerViewAnimationClass(
    view: DrawerInternalView,
    transition: DrawerViewTransition,
  ) {
    if (transition.from === view) {
      return transition.direction === 'forward'
        ? 'drawer-view-slide-out-left'
        : 'drawer-view-slide-out-right'
    }

    return transition.direction === 'forward'
      ? 'drawer-view-slide-in-right'
      : 'drawer-view-slide-in-left'
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
      {!isPdfFlowDetached ? (
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
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {viewTransition ? (
              <>
                <div
                  className={`absolute inset-0 min-h-0 overflow-hidden ${getDrawerViewAnimationClass(
                    viewTransition.from,
                    viewTransition,
                  )} motion-reduce:animate-none`}
                >
                  {renderDrawerInternalView(viewTransition.from)}
                </div>
                <div
                  className={`absolute inset-0 min-h-0 overflow-hidden ${getDrawerViewAnimationClass(
                    viewTransition.to,
                    viewTransition,
                  )} motion-reduce:animate-none`}
                >
                  {renderDrawerInternalView(viewTransition.to)}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 min-h-0 overflow-hidden">
                {renderDrawerInternalView(activeView)}
              </div>
            )}
          </div>
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
              ? `absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:duration-0 ${
                  isVisible ? 'opacity-100' : 'opacity-0'
                }`
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
                onPrepareForSuccessCleanup={prepareForSubmittedProjectCleanup}
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
                draftProjects={selectableProjects}
                isLoadingProjects={isLoading}
                onProjectSelectionChange={handleActiveProjectChange}
                onPersistedProjectChange={handlePersistedProjectChange}
                onProjectsRefresh={refreshProjects}
                onBusyStateChange={setIsPdfFlowBusy}
                onRegisterProjectFormFlush={(handler) => {
                  projectFormFlushRef.current = handler
                }}
                onAutosaveIndicatorChange={setProjectAutosaveIndicator}
              />
            </div>
          </Suspense>
        </div>
      )}
      <AppModal
        open={isExitEditModalOpen}
        onClose={() => {
          setIsExitEditModalOpen(false)
          setPendingProjectIdAfterExit(undefined)
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
                setPendingProjectIdAfterExit(undefined)
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/14 bg-white/8 px-4.5 text-sm font-medium text-brand-100 transition hover:bg-white/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Seguir editando
            </button>
            <button
              type="button"
              onClick={async () => {
                const didExitEditing = await flushAndFinishProjectEditing(activeEditingProjectId)

                if (!didExitEditing) {
                  return
                }

                const nextProjectId = pendingProjectIdAfterExit
                setIsExitEditModalOpen(false)
                setPendingProjectIdAfterExit(undefined)
                await performActiveProjectChange(nextProjectId ?? null)
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-300 px-4.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D]"
            >
              Salir
            </button>
          </div>
        </div>
      </AppModal>
    </div>
  )
}

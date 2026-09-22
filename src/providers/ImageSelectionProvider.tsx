import { useCriticalState } from '@/version-recovery/useCriticalState.ts'
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { useAuth } from '@/hooks/useAuth.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import {
  clearImageSelectionStorage,
  persistImageSelectionCache,
  restoreImageSelectionCache,
  type ProjectSelectionEmptyIntent,
} from '@/utils/image-selection-storage.ts'
import { appendSelectionDebugEvent } from '@/utils/selection-debug-log.ts'
import {
  SelectionSyncQueue,
  type SelectionSyncSnapshot,
} from '@/utils/selection-sync-queue.ts'
import {
  persistSelectionActiveContext,
  restoreSelectionActiveContext,
  SELECTION_ACTIVE_CONTEXT_CHANGE_EVENT,
  type SelectionActiveContext,
} from '@/utils/selection-active-context-storage.ts'
import { fetchProjectSelectionImages } from '@/utils/selection-project-images.ts'
import { syncRequestProjectSelection } from '@/services/request-projects.service.ts'

export type SelectionStatus = 'idle' | 'loading' | 'ready' | 'syncing' | 'error'

export type ConfirmedSelection = {
  projectId: string
  images: SelectedLocationImage[]
  version: number
  confirmedAt: string
}

type ReplaceSelectionOptions = {
  projectId?: string | null
  source?: 'local' | 'remote'
  expectedVersion?: number
}

type ClearSelectionOptions = {
  projectId?: string | null
}

type LocalSelectionUpdateOptions = {
  emptyIntent?: ProjectSelectionEmptyIntent
}

type SetActiveProjectContextOptions = {
  hydrate?: boolean
  persist?: boolean
}

type LoadProjectSelectionOptions = {
  force?: boolean
}

type PendingPersistedContextEvent =
  | {
      mode: 'new'
    }
  | {
      mode: 'project'
      projectId: string
      hydrate: boolean
    }

type ImageSelectionContextValue = {
  activeProjectId: string | null
  images: SelectedLocationImage[]
  pendingSelectionImages: SelectedLocationImage[]
  status: SelectionStatus
  error: string | null
  dirty: boolean
  version: number
  confirmedVersion: number
  confirmedSelection: ConfirmedSelection | null
  isMutationLocked: boolean
  isDrawerOpen: boolean
  isHydratingActiveProjectSelection: boolean
  isProjectSelectionPendingResolution: boolean
  hasProjectSelection: (projectId: string | null | undefined) => boolean
  getProjectSelection: (
    projectId: string | null | undefined,
  ) => SelectedLocationImage[] | null
  addImage: (image: SelectedLocationImage) => void
  replaceSelection: (
    images: SelectedLocationImage[],
    options?: ReplaceSelectionOptions,
  ) => boolean
  removeImage: (key: string) => void
  clearSelection: (options?: ClearSelectionOptions) => void
  isSelected: (key: string) => boolean
  getProjectSelectionVersion: (projectId: string | null | undefined) => number
  getProjectSelectionDebugState: (
    projectId: string | null | undefined,
  ) => { dirty: boolean; version: number; emptyIntent: ProjectSelectionEmptyIntent } | null
  getProjectSelectionEmptyIntent: (
    projectId: string | null | undefined,
  ) => ProjectSelectionEmptyIntent
  markProjectSelectionSynced: (
    projectId: string | null | undefined,
    version: number,
  ) => boolean
  setActiveProjectContext: (
    projectId: string | null,
    options?: SetActiveProjectContextOptions,
  ) => void
  selectProject: (
    projectId: string | null,
    options?: SetActiveProjectContextOptions,
  ) => void
  loadProjectSelection: (
    projectId: string,
    options?: LoadProjectSelectionOptions,
  ) => Promise<SelectedLocationImage[] | null>
  flushSelection: (projectId?: string | null) => Promise<ConfirmedSelection>
  lockSelectionMutations: () => void
  unlockSelectionMutations: () => void
  clearPendingSelectionIntent: () => void
  openDrawer: () => void
  closeDrawer: () => void
  toggleDrawer: () => void
}

type ImageSelectionProviderProps = {
  children: ReactNode
}

const MAX_SELECTED_IMAGES = 80

function normalizeProjectId(projectId: string | null | undefined) {
  if (typeof projectId !== 'string') {
    return null
  }

  const normalizedProjectId = projectId.trim()
  return normalizedProjectId.length > 0 ? normalizedProjectId : null
}

function normalizeImages(images: SelectedLocationImage[]) {
  const uniqueImages = new Map<string, SelectedLocationImage>()

  for (const image of images) {
    if (uniqueImages.has(image.key)) {
      continue
    }

    uniqueImages.set(image.key, image)
  }

  return [...uniqueImages.values()].slice(0, MAX_SELECTED_IMAGES)
}

function createSelectionSnapshotKey(images: SelectedLocationImage[]) {
  return JSON.stringify(
    images.map((image) => ({
      key: image.key,
      locationId: image.locationId,
      locationImageId: image.locationImageId ?? null,
      sortOrder: image.sortOrder,
    })),
  )
}

function resolveContextProjectId(context: SelectionActiveContext | null) {
  return context?.mode === 'project' ? context.projectId : null
}

export const ImageSelectionContext = createContext<ImageSelectionContextValue | undefined>(
  undefined,
)

export function ImageSelectionProvider({
  children,
}: ImageSelectionProviderProps) {
  const { canUsePrivateFeatures, user, loading: authLoading } = useAuth()
  const privateOwnerRef = useRef<string | undefined>(undefined)
  privateOwnerRef.current = canUsePrivateFeatures ? user?.id : undefined
  const initialSelectionCache = useMemo(() => restoreImageSelectionCache(), [])
  const projectSelectionsRef = useRef(initialSelectionCache.projectSelections)
  const projectSelectionVersionsRef = useRef<Record<string, number>>(
    Object.fromEntries(
      Object.entries(initialSelectionCache.projectSelectionState).map(
        ([projectId, state]) => [projectId, state.version],
      ),
    ),
  )
  const projectSelectionDirtyRef = useRef<Record<string, boolean>>(
    Object.fromEntries(
      Object.entries(initialSelectionCache.projectSelectionState).map(
        ([projectId, state]) => [projectId, state.dirty],
      ),
    ),
  )
  const projectSelectionEmptyIntentRef = useRef<Record<string, ProjectSelectionEmptyIntent>>(
    Object.fromEntries(
      Object.entries(initialSelectionCache.projectSelectionState).map(
        ([projectId, state]) => [projectId, state.emptyIntent],
      ),
    ),
  )
  const projectSelectionConfirmedVersionsRef = useRef<Record<string, number>>(
    Object.fromEntries(
      Object.entries(initialSelectionCache.projectSelectionState)
        .filter(([, state]) => !state.dirty)
        .map(([projectId, state]) => [projectId, state.version]),
    ),
  )
  const projectSelectionConfirmedAtRef = useRef<Record<string, string>>(
    Object.fromEntries(
      Object.entries(initialSelectionCache.projectSelectionState)
        .filter(([, state]) => !state.dirty)
        .map(([projectId]) => [projectId, new Date().toISOString()]),
    ),
  )
  const initialActiveProjectId = useMemo(
    () => resolveContextProjectId(restoreSelectionActiveContext()),
    [],
  )
  const [globalImages, setGlobalImages] = useState(initialSelectionCache.globalImages)
  const globalImagesRef = useRef(initialSelectionCache.globalImages)
  const [projectSelections, setProjectSelections] = useState(
    initialSelectionCache.projectSelections,
  )
  const [pendingSelectionImages, setPendingSelectionImages] = useState<
    SelectedLocationImage[]
  >([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialActiveProjectId,
  )
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isHydratingActiveProjectSelection, setIsHydratingActiveProjectSelection] =
    useState(Boolean(initialActiveProjectId))
  const [selectionStatus, setSelectionStatus] = useState<SelectionStatus>('idle')
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [isMutationLocked, setIsMutationLocked] = useState(false)
  const [, setSelectionRevision] = useState(0)
  const activeProjectIdRef = useRef<string | null>(initialActiveProjectId)
  const isHydratingActiveProjectSelectionRef = useRef(
    Boolean(initialActiveProjectId),
  )
  const isProjectSelectionPendingResolutionRef = useRef(Boolean(initialActiveProjectId))
  const hydrationRequestIdRef = useRef(0)
  const activeHydrationProjectIdRef = useRef<string | null>(null)
  const activeHydrationPromiseRef = useRef<{
    projectId: string
    promise: Promise<SelectedLocationImage[] | null>
  } | null>(null)
  const projectSelectionSyncQueueRef =
    useRef<SelectionSyncQueue<SelectedLocationImage> | null>(null)
  const pendingPersistedContextEventRef = useRef<PendingPersistedContextEvent | null>(null)

  useCriticalState(pendingSelectionImages.length > 0 || isHydratingActiveProjectSelection || globalImages.length > 0 || Object.values(projectSelections).some(images => images.length > 0))

  const images = activeProjectId
    ? projectSelections[activeProjectId] ?? []
    : globalImages
  const hasResolvedActiveProjectSelection =
    !activeProjectId ||
    Object.prototype.hasOwnProperty.call(projectSelections, activeProjectId)
  const isProjectSelectionPendingResolution = Boolean(
    activeProjectId &&
      (isHydratingActiveProjectSelection || !hasResolvedActiveProjectSelection),
  )
  const dirty = activeProjectId
    ? projectSelectionDirtyRef.current[activeProjectId] ?? false
    : false
  const version = activeProjectId
    ? projectSelectionVersionsRef.current[activeProjectId] ?? 0
    : 0
  const confirmedVersion = activeProjectId
    ? projectSelectionConfirmedVersionsRef.current[activeProjectId] ?? 0
    : 0
  const logSelectionDebugEvent = useCallback((
    event: string,
    {
      projectId = activeProjectIdRef.current,
      source,
      details,
    }: {
      projectId?: string | null
      source?: string
      details?: Record<string, unknown>
    } = {},
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)
    const activeProjectImages = normalizedProjectId
      ? projectSelectionsRef.current[normalizedProjectId]
      : null

    appendSelectionDebugEvent({
      event,
      activeProjectId: normalizedProjectId,
      imagesCount: normalizedProjectId
        ? activeProjectImages?.length ?? 0
        : globalImagesRef.current.length,
      projectSelectionCount: activeProjectImages?.length ?? null,
      dirty: normalizedProjectId
        ? projectSelectionDirtyRef.current[normalizedProjectId] ?? false
        : null,
      version: normalizedProjectId
        ? projectSelectionVersionsRef.current[normalizedProjectId] ?? 0
        : null,
      isHydratingActiveProjectSelection:
        isHydratingActiveProjectSelectionRef.current,
      isProjectSelectionPendingResolution:
        isProjectSelectionPendingResolutionRef.current,
      source,
      details: {
        projectSelectionKeys: Object.keys(projectSelectionsRef.current),
        emptyIntent: normalizedProjectId
          ? projectSelectionEmptyIntentRef.current[normalizedProjectId] ?? null
          : null,
        ...details,
      },
    })
  }, [])

  const logSelectionCountTransition = useCallback((
    source: string,
    projectId: string | null,
    previousCount: number,
    nextCount: number,
    details?: Record<string, unknown>,
  ) => {
    logSelectionDebugEvent(source, {
      projectId,
      source,
      details: {
        previousCount,
        nextCount,
        ...details,
      },
    })

    if (previousCount > 0 && nextCount === 0) {
      logSelectionDebugEvent('SELECTION_BECOMING_EMPTY', {
        projectId,
        source,
        details: {
          previousCount,
          nextCount,
          projectSelectionKeys: Object.keys(projectSelectionsRef.current),
          ...details,
        },
      })
    }
  }, [logSelectionDebugEvent])

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId
  }, [activeProjectId])

  useEffect(() => {
    isHydratingActiveProjectSelectionRef.current = isHydratingActiveProjectSelection
  }, [isHydratingActiveProjectSelection])

  useEffect(() => {
    isProjectSelectionPendingResolutionRef.current =
      isProjectSelectionPendingResolution
  }, [isProjectSelectionPendingResolution])

  const hasLoggedProviderMountRef = useRef(false)

  useEffect(() => {
    if (hasLoggedProviderMountRef.current) {
      return
    }

    hasLoggedProviderMountRef.current = true
    logSelectionDebugEvent('provider_mount', {
      projectId: initialActiveProjectId,
    })
    logSelectionDebugEvent('provider_restore_cache', {
      projectId: initialActiveProjectId,
      details: {
        globalImagesCount: initialSelectionCache.globalImages.length,
        projectSelectionKeys: Object.keys(initialSelectionCache.projectSelections),
        projectSelectionState: initialSelectionCache.projectSelectionState,
      },
    })
    logSelectionDebugEvent('provider_restore_active_context', {
      projectId: initialActiveProjectId,
      details: {
        initialActiveProjectId,
      },
    })
  }, [
    initialActiveProjectId,
    initialSelectionCache.globalImages.length,
    initialSelectionCache.projectSelectionState,
    initialSelectionCache.projectSelections,
    logSelectionDebugEvent,
  ])

  const previousActiveProjectIdRef = useRef(activeProjectId)

  useEffect(() => {
    const previousActiveProjectId = previousActiveProjectIdRef.current

    if (previousActiveProjectId !== activeProjectId) {
      logSelectionDebugEvent('active_project_change', {
        projectId: activeProjectId,
        details: {
          previousActiveProjectId,
          nextActiveProjectId: activeProjectId,
        },
      })
    }

    previousActiveProjectIdRef.current = activeProjectId
  }, [activeProjectId, logSelectionDebugEvent])

  const previousImagesCountRef = useRef(images.length)

  useEffect(() => {
    const previousImagesCount = previousImagesCountRef.current

    if (previousImagesCount !== images.length) {
      logSelectionCountTransition(
        'images_count_change',
        activeProjectId,
        previousImagesCount,
        images.length,
      )
    }

    previousImagesCountRef.current = images.length
  }, [activeProjectId, images.length, logSelectionCountTransition])

  useEffect(() => {
    globalImagesRef.current = globalImages
  }, [globalImages])

  useEffect(() => {
    projectSelectionsRef.current = projectSelections
  }, [projectSelections])

  const getProjectSelectionState = useCallback((
    selections: Record<string, SelectedLocationImage[]> = projectSelectionsRef.current,
  ) => {
    const nextState: Record<
      string,
      { dirty: boolean; version: number; emptyIntent: ProjectSelectionEmptyIntent }
    > = {}

    for (const projectId of Object.keys(selections)) {
      nextState[projectId] = {
        dirty: projectSelectionDirtyRef.current[projectId] ?? false,
        version: projectSelectionVersionsRef.current[projectId] ?? 0,
        emptyIntent: selections[projectId]?.length
          ? null
          : projectSelectionEmptyIntentRef.current[projectId] ?? 'unknown-empty',
      }
    }

    return nextState
  }, [])

  useEffect(() => {
    const hasProjectSelections = Object.keys(projectSelections).length > 0

    if (globalImages.length === 0 && !hasProjectSelections) {
      clearImageSelectionStorage()
      logSelectionDebugEvent('persist_effect', {
        details: {
          action: 'clear_storage',
          globalImagesCount: 0,
          projectSelectionKeys: [],
        },
      })
      return
    }

    persistImageSelectionCache({
      globalImages,
      projectSelections,
      projectSelectionState: getProjectSelectionState(),
    })
    logSelectionDebugEvent('persist_effect', {
      details: {
        action: 'persist_cache',
        globalImagesCount: globalImages.length,
        projectSelectionKeys: Object.keys(projectSelections),
      },
    })
  }, [getProjectSelectionState, globalImages, logSelectionDebugEvent, projectSelections])

  const persistCurrentSelectionCache = useCallback(() => {
    persistImageSelectionCache({
      globalImages: globalImagesRef.current,
      projectSelections: projectSelectionsRef.current,
      projectSelectionState: getProjectSelectionState(),
    })
  }, [getProjectSelectionState])

  const persistSelectionStateImmediately = useCallback((
    nextProjectSelections: Record<string, SelectedLocationImage[]>,
    nextGlobalImages = globalImagesRef.current,
  ) => {
    persistImageSelectionCache({
      globalImages: nextGlobalImages,
      projectSelections: nextProjectSelections,
      projectSelectionState: getProjectSelectionState(nextProjectSelections),
    })
    logSelectionDebugEvent('persist_immediate', {
      details: {
        globalImagesCount: nextGlobalImages.length,
        projectSelectionKeys: Object.keys(nextProjectSelections),
      },
    })
  }, [getProjectSelectionState, logSelectionDebugEvent])

  const getProjectSelectionEmptyIntent = useCallback((
    projectId: string | null | undefined,
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      return null
    }

    const projectImages = projectSelectionsRef.current[normalizedProjectId]

    if (projectImages && projectImages.length > 0) {
      return null
    }

    return projectSelectionEmptyIntentRef.current[normalizedProjectId] ?? null
  }, [])

  const markProjectSelectionConfirmed = useCallback((
    projectId: string,
    version: number,
    confirmedAt = new Date().toISOString(),
  ) => {
    const currentVersion = projectSelectionVersionsRef.current[projectId] ?? 0

    projectSelectionDirtyRef.current = {
      ...projectSelectionDirtyRef.current,
      [projectId]: currentVersion > version,
    }
    projectSelectionConfirmedVersionsRef.current = {
      ...projectSelectionConfirmedVersionsRef.current,
      [projectId]: version,
    }
    projectSelectionConfirmedAtRef.current = {
      ...projectSelectionConfirmedAtRef.current,
      [projectId]: confirmedAt,
    }
    setSelectionRevision((currentRevision) => currentRevision + 1)
  }, [])

  const getProjectSelectionSyncSnapshot = useCallback((
    projectId: string,
  ): SelectionSyncSnapshot<SelectedLocationImage> | null => {
    const images = projectSelectionsRef.current[projectId] ?? []
    const emptyIntent = getProjectSelectionEmptyIntent(projectId)

    return {
      projectId,
      images,
      version: projectSelectionVersionsRef.current[projectId] ?? 0,
      emptyIntent,
      snapshotKey: createSelectionSnapshotKey(images),
    }
  }, [getProjectSelectionEmptyIntent])

  const canSyncProjectSelectionSnapshot = useCallback((
    snapshot: SelectionSyncSnapshot<SelectedLocationImage>,
  ) => snapshot.images.length > 0 || snapshot.emptyIntent === 'explicit-clear', [])

  if (!projectSelectionSyncQueueRef.current) {
    projectSelectionSyncQueueRef.current = new SelectionSyncQueue<SelectedLocationImage>({
      getSnapshot: getProjectSelectionSyncSnapshot,
      canSyncSnapshot: canSyncProjectSelectionSnapshot,
      syncSnapshot: async (snapshot) => {
        await syncRequestProjectSelection(snapshot.projectId, snapshot.images, {
          allowEmptySelection:
            snapshot.images.length === 0 &&
            snapshot.emptyIntent === 'explicit-clear',
        })
      },
      onStart: (snapshot) => {
        setSelectionStatus('syncing')
        setSelectionError(null)
        logSelectionDebugEvent('provider_sync_start', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
            emptyIntent: snapshot.emptyIntent,
          },
        })
      },
      onPending: (snapshot) => {
      logSelectionDebugEvent('provider_sync_pending', {
          projectId: snapshot.projectId,
        source: 'provider_sync_queue',
        details: {
          version: snapshot.version,
          imageCount: snapshot.images.length,
        },
      })
      },
      onSkip: (snapshot) => {
        logSelectionDebugEvent('provider_sync_skip', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            reason: 'empty_without_explicit_clear',
            emptyIntent: snapshot.emptyIntent,
          },
        })
      },
      onConfirmed: (snapshot) => {
        markProjectSelectionConfirmed(snapshot.projectId, snapshot.version)
        persistCurrentSelectionCache()
        logSelectionDebugEvent('provider_sync_success', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
          },
        })
      },
      onError: (snapshot, error) => {
        const message = error instanceof Error
          ? error.message
          : 'No pudimos guardar la seleccion del proyecto.'

        setSelectionStatus('error')
        setSelectionError(message)
        logSelectionDebugEvent('provider_sync_error', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
            message,
          },
        })
      },
      onIdle: (projectId) => {
        if (
          activeProjectIdRef.current === projectId &&
          !(projectSelectionDirtyRef.current[projectId] ?? false)
        ) {
          setSelectionStatus('ready')
          setSelectionError(null)
        }
      },
    })
  } else {
    projectSelectionSyncQueueRef.current.updateOptions({
      getSnapshot: getProjectSelectionSyncSnapshot,
      canSyncSnapshot: canSyncProjectSelectionSnapshot,
      syncSnapshot: async (snapshot) => {
        await syncRequestProjectSelection(snapshot.projectId, snapshot.images, {
          allowEmptySelection:
            snapshot.images.length === 0 &&
            snapshot.emptyIntent === 'explicit-clear',
        })
      },
      onStart: (snapshot) => {
        setSelectionStatus('syncing')
        setSelectionError(null)
        logSelectionDebugEvent('provider_sync_start', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
            emptyIntent: snapshot.emptyIntent,
          },
        })
      },
      onPending: (snapshot) => {
        logSelectionDebugEvent('provider_sync_pending', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
          },
        })
      },
      onSkip: (snapshot) => {
        logSelectionDebugEvent('provider_sync_skip', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            reason: 'empty_without_explicit_clear',
            emptyIntent: snapshot.emptyIntent,
          },
        })
      },
      onConfirmed: (snapshot) => {
        markProjectSelectionConfirmed(snapshot.projectId, snapshot.version)
        persistCurrentSelectionCache()
        logSelectionDebugEvent('provider_sync_success', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
          },
        })
      },
      onError: (snapshot, error) => {
        const message = error instanceof Error
          ? error.message
          : 'No pudimos guardar la seleccion del proyecto.'

        setSelectionStatus('error')
        setSelectionError(message)
        logSelectionDebugEvent('provider_sync_error', {
          projectId: snapshot.projectId,
          source: 'provider_sync_queue',
          details: {
            version: snapshot.version,
            imageCount: snapshot.images.length,
            message,
          },
        })
      },
      onIdle: (projectId) => {
        if (
          activeProjectIdRef.current === projectId &&
          !(projectSelectionDirtyRef.current[projectId] ?? false)
        ) {
          setSelectionStatus('ready')
          setSelectionError(null)
        }
      },
    })
  }

  const enqueueProjectSelectionSync = useCallback((projectId: string) => {
    projectSelectionSyncQueueRef.current?.enqueue(projectId)
  }, [])

  const applyLocalProjectSelectionUpdate = useCallback((
    projectId: string,
    resolveNextImages: (
      currentImages: SelectedLocationImage[],
    ) => SelectedLocationImage[],
    source: string,
    options: LocalSelectionUpdateOptions = {},
  ) => {
    const currentProjectSelections = projectSelectionsRef.current
    const previousImages = currentProjectSelections[projectId] ?? []
    const nextImages = normalizeImages(
      resolveNextImages(previousImages),
    )
    const nextVersion = (projectSelectionVersionsRef.current[projectId] ?? 0) + 1
    const nextProjectSelections = {
      ...currentProjectSelections,
      [projectId]: nextImages,
    }

    projectSelectionVersionsRef.current = {
      ...projectSelectionVersionsRef.current,
      [projectId]: nextVersion,
    }
    projectSelectionDirtyRef.current = {
      ...projectSelectionDirtyRef.current,
      [projectId]: true,
    }
    projectSelectionEmptyIntentRef.current = {
      ...projectSelectionEmptyIntentRef.current,
      [projectId]: nextImages.length > 0
        ? null
        : options.emptyIntent ?? 'unknown-empty',
    }
    projectSelectionsRef.current = nextProjectSelections
    setProjectSelections(nextProjectSelections)
    persistSelectionStateImmediately(nextProjectSelections)
    logSelectionCountTransition(
      source,
      projectId,
      previousImages.length,
      nextImages.length,
      {
        nextVersion,
        emptyIntent: projectSelectionEmptyIntentRef.current[projectId],
      },
    )
    enqueueProjectSelectionSync(projectId)
  }, [
    enqueueProjectSelectionSync,
    logSelectionCountTransition,
    persistSelectionStateImmediately,
  ])

  const markProjectSelectionRemoteHydrated = useCallback((projectId: string) => {
    const currentVersion = projectSelectionVersionsRef.current[projectId] ?? 0

    markProjectSelectionConfirmed(projectId, currentVersion)
    projectSelectionDirtyRef.current = {
      ...projectSelectionDirtyRef.current,
      [projectId]: false,
    }
    projectSelectionEmptyIntentRef.current = {
      ...projectSelectionEmptyIntentRef.current,
      [projectId]: null,
    }
  }, [markProjectSelectionConfirmed])

  const getProjectSelectionVersion = useCallback((
    projectId: string | null | undefined,
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      return 0
    }

    return projectSelectionVersionsRef.current[normalizedProjectId] ?? 0
  }, [])

  const getProjectSelectionDebugState = useCallback((
    projectId: string | null | undefined,
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      return null
    }

    return {
      dirty: projectSelectionDirtyRef.current[normalizedProjectId] ?? false,
      version: projectSelectionVersionsRef.current[normalizedProjectId] ?? 0,
      emptyIntent: getProjectSelectionEmptyIntent(normalizedProjectId),
    }
  }, [getProjectSelectionEmptyIntent])

  const canApplyRemoteProjectSelection = useCallback((
    projectId: string,
    expectedVersion: number,
    remoteCount = 0,
  ) => {
    const localImages = projectSelectionsRef.current[projectId]
    const localEmptyIntent = getProjectSelectionEmptyIntent(projectId)
    const isUnknownEmptyLocalState =
      Boolean(localImages) &&
      localImages.length === 0 &&
      localEmptyIntent !== 'explicit-clear'

    if (isUnknownEmptyLocalState && remoteCount > 0) {
      return true
    }

    return !projectSelectionDirtyRef.current[projectId] &&
      (projectSelectionVersionsRef.current[projectId] ?? 0) === expectedVersion
  }, [getProjectSelectionEmptyIntent])

  const markProjectSelectionSynced = useCallback((
    projectId: string | null | undefined,
    version: number,
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      return false
    }

    if ((projectSelectionVersionsRef.current[normalizedProjectId] ?? 0) !== version) {
      return false
    }

    const projectImages = projectSelectionsRef.current[normalizedProjectId] ?? []

    if (
      projectImages.length === 0 &&
      getProjectSelectionEmptyIntent(normalizedProjectId) !== 'explicit-clear'
    ) {
      return false
    }

    markProjectSelectionConfirmed(normalizedProjectId, version)
    persistCurrentSelectionCache()
    return true
  }, [
    getProjectSelectionEmptyIntent,
    markProjectSelectionConfirmed,
    persistCurrentSelectionCache,
  ])

  const hydrateProjectSelection = useCallback(async (projectId: string) => {
    const owner = privateOwnerRef.current
    if (!owner) return null
    if (activeHydrationProjectIdRef.current === projectId) {
      logSelectionDebugEvent('provider_hydration_skip', {
        projectId,
        source: 'provider',
        details: {
          reason: 'same_project_in_flight',
          requestId: hydrationRequestIdRef.current,
        },
      })
      return activeHydrationPromiseRef.current?.projectId === projectId
        ? activeHydrationPromiseRef.current.promise
        : null
    }

    const requestId = hydrationRequestIdRef.current + 1
    const selectionVersionAtRequestStart = getProjectSelectionVersion(projectId)
    hydrationRequestIdRef.current = requestId
    activeHydrationProjectIdRef.current = projectId
    setIsHydratingActiveProjectSelection(true)
    setSelectionStatus('loading')
    setSelectionError(null)
    logSelectionDebugEvent('provider_hydration_start', {
      projectId,
      source: 'provider',
      details: {
        requestId,
        selectionVersionAtRequestStart,
      },
    })

    let hydrationPromise: Promise<SelectedLocationImage[] | null> | null = null
    hydrationPromise = (async () => {
      try {
      const nextSelection = await fetchProjectSelectionImages(projectId)
      logSelectionDebugEvent('provider_hydration_result', {
        projectId,
        source: 'provider',
        details: {
          requestId,
          remoteCount: nextSelection.length,
          selectionVersionAtRequestStart,
        },
      })

      if (
        privateOwnerRef.current !== owner ||
        hydrationRequestIdRef.current !== requestId ||
        activeProjectIdRef.current !== projectId ||
        !canApplyRemoteProjectSelection(
          projectId,
          selectionVersionAtRequestStart,
          nextSelection.length,
        )
      ) {
        logSelectionDebugEvent('provider_hydration_skip', {
          projectId,
          source: 'provider',
          details: {
            requestId,
            remoteCount: nextSelection.length,
            ownerChanged: privateOwnerRef.current !== owner,
            requestStale: hydrationRequestIdRef.current !== requestId,
            activeProjectChanged: activeProjectIdRef.current !== projectId,
            blockedByLocalState: !canApplyRemoteProjectSelection(
              projectId,
              selectionVersionAtRequestStart,
              nextSelection.length,
            ),
            localEmptyIntent: getProjectSelectionEmptyIntent(projectId),
          },
        })
        setSelectionStatus('ready')
        return null
      }

      const previousCount = projectSelectionsRef.current[projectId]?.length ?? 0
      const normalizedNextSelection = normalizeImages(nextSelection)
      const nextProjectSelections = {
        ...projectSelectionsRef.current,
        [projectId]: normalizedNextSelection,
      }

      projectSelectionsRef.current = nextProjectSelections
      setProjectSelections(nextProjectSelections)
      markProjectSelectionRemoteHydrated(projectId)
      logSelectionCountTransition(
        'provider_hydration_apply',
        projectId,
        previousCount,
        normalizedNextSelection.length,
        {
          requestId,
          remoteCount: nextSelection.length,
        },
      )
      setSelectionStatus('ready')
      return normalizedNextSelection
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'No pudimos cargar la seleccion del proyecto.'
      setSelectionStatus('error')
      setSelectionError(message)
      logSelectionDebugEvent('provider_hydration_skip', {
        projectId,
        source: 'provider',
        details: {
          requestId,
          reason: 'error',
          message,
        },
      })
      // Rehydration is best-effort. Callers intentionally do not need to handle it.
      return null
    } finally {
      if (
        hydrationRequestIdRef.current === requestId &&
        activeProjectIdRef.current === projectId
      ) {
        setIsHydratingActiveProjectSelection(false)
      }
      if (
        hydrationRequestIdRef.current === requestId &&
        activeHydrationProjectIdRef.current === projectId
      ) {
        activeHydrationProjectIdRef.current = null
      }
      if (
        hydrationPromise &&
        activeHydrationPromiseRef.current?.projectId === projectId &&
        activeHydrationPromiseRef.current.promise === hydrationPromise
      ) {
        activeHydrationPromiseRef.current = null
      }
    }
    })()

    activeHydrationPromiseRef.current = {
      projectId,
      promise: hydrationPromise,
    }

    return hydrationPromise
  }, [
    canApplyRemoteProjectSelection,
    getProjectSelectionEmptyIntent,
    getProjectSelectionVersion,
    logSelectionCountTransition,
    logSelectionDebugEvent,
    markProjectSelectionRemoteHydrated,
  ])

  const hasProjectSelection = useCallback((projectId: string | null | undefined) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      return false
    }

    return Object.prototype.hasOwnProperty.call(projectSelections, normalizedProjectId)
  }, [projectSelections])

  const getProjectSelection = useCallback((
    projectId: string | null | undefined,
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      return null
    }

    return projectSelections[normalizedProjectId] ?? null
  }, [projectSelections])

  const setActiveProjectContext = useCallback((
    projectId: string | null,
    options: SetActiveProjectContextOptions = {},
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)
    const shouldHydrate =
      (options.hydrate ?? Boolean(normalizedProjectId)) &&
      !authLoading &&
      canUsePrivateFeatures
    const shouldPersist = options.persist ?? true

    logSelectionDebugEvent('active_project_change', {
      projectId: normalizedProjectId,
      source: 'set_active_project_context',
      details: {
        previousActiveProjectId: activeProjectIdRef.current,
        nextActiveProjectId: normalizedProjectId,
        shouldHydrate,
        shouldPersist,
      },
    })
    if (activeProjectIdRef.current !== normalizedProjectId) {
      hydrationRequestIdRef.current += 1
    }
    activeProjectIdRef.current = normalizedProjectId
    setActiveProjectId(normalizedProjectId)

    if (!normalizedProjectId) {
      activeHydrationProjectIdRef.current = null
      setSelectionStatus('idle')
      setSelectionError(null)
      setIsHydratingActiveProjectSelection(false)

      if (shouldPersist) {
        pendingPersistedContextEventRef.current = {
          mode: 'new',
        }
        persistSelectionActiveContext({ mode: 'new' })
      }

      return
    }

    setIsHydratingActiveProjectSelection(shouldHydrate)
    setSelectionStatus(shouldHydrate ? 'loading' : 'ready')
    setSelectionError(null)

    if (shouldPersist) {
      pendingPersistedContextEventRef.current = {
        mode: 'project',
        projectId: normalizedProjectId,
        hydrate: shouldHydrate,
      }
      persistSelectionActiveContext({ mode: 'project', projectId: normalizedProjectId })
    }

    if (shouldHydrate) {
      void hydrateProjectSelection(normalizedProjectId)
    }
  }, [
    authLoading,
    hydrateProjectSelection,
    canUsePrivateFeatures,
    logSelectionDebugEvent,
  ])

  const selectProject = useCallback((
    projectId: string | null,
    options: SetActiveProjectContextOptions = {},
  ) => {
    setActiveProjectContext(projectId, options)
  }, [setActiveProjectContext])

  const loadProjectSelection = useCallback(async (
    projectId: string,
    options: LoadProjectSelectionOptions = {},
  ) => {
    const normalizedProjectId = normalizeProjectId(projectId)

    if (!normalizedProjectId) {
      setSelectionStatus('error')
      setSelectionError('Proyecto invalido.')
      return null
    }

    const hasResolvedSelection = Object.prototype.hasOwnProperty.call(
      projectSelectionsRef.current,
      normalizedProjectId,
    )
    const isDirtySelection =
      projectSelectionDirtyRef.current[normalizedProjectId] ?? false

    if (!options.force && hasResolvedSelection && !isDirtySelection) {
      setSelectionStatus('ready')
      setSelectionError(null)
      return projectSelectionsRef.current[normalizedProjectId] ?? []
    }

    return hydrateProjectSelection(normalizedProjectId)
  }, [hydrateProjectSelection])

  const flushSelection = useCallback(async (
    projectId?: string | null,
  ): Promise<ConfirmedSelection> => {
    const normalizedProjectId = normalizeProjectId(
      projectId === undefined ? activeProjectIdRef.current : projectId,
    )

    if (!normalizedProjectId) {
      throw new Error('Debes seleccionar un proyecto antes de confirmar la seleccion.')
    }

    if (activeHydrationPromiseRef.current?.projectId === normalizedProjectId) {
      await activeHydrationPromiseRef.current.promise
    }

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const currentVersion =
        projectSelectionVersionsRef.current[normalizedProjectId] ?? 0
      const currentImages = projectSelectionsRef.current[normalizedProjectId] ?? []
      const currentConfirmedVersion =
        projectSelectionConfirmedVersionsRef.current[normalizedProjectId] ?? 0
      const isDirtySelection =
        projectSelectionDirtyRef.current[normalizedProjectId] ?? false

      if (!isDirtySelection && currentConfirmedVersion === currentVersion) {
        return {
          projectId: normalizedProjectId,
          images: currentImages,
          version: currentVersion,
          confirmedAt:
            projectSelectionConfirmedAtRef.current[normalizedProjectId] ??
            new Date().toISOString(),
        }
      }

      const emptyIntent = getProjectSelectionEmptyIntent(normalizedProjectId)

      if (currentImages.length === 0 && emptyIntent !== 'explicit-clear') {
        throw new Error('No hay una seleccion confirmable para guardar.')
      }

      if (!projectSelectionSyncQueueRef.current?.getInFlight(normalizedProjectId)) {
        enqueueProjectSelectionSync(normalizedProjectId)
      }

      const writePromise =
        projectSelectionSyncQueueRef.current?.getWritePromise(normalizedProjectId)

      if (!writePromise) {
        continue
      }

      try {
        await writePromise
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : 'No pudimos confirmar la seleccion del proyecto.'

        setSelectionStatus('error')
        setSelectionError(message)
        throw error
      }
    }

    throw new Error('No pudimos confirmar la seleccion del proyecto.')
  }, [
    enqueueProjectSelectionSync,
    getProjectSelectionEmptyIntent,
  ])

  const lockSelectionMutations = useCallback(() => {
    setIsMutationLocked(true)
  }, [])

  const unlockSelectionMutations = useCallback(() => {
    setIsMutationLocked(false)
  }, [])

  useEffect(() => {
    function handleSelectionActiveContextChange(event: Event) {
      const customEvent = event as CustomEvent<{ context?: SelectionActiveContext }>
      const nextContext = customEvent.detail?.context ?? restoreSelectionActiveContext()
      const nextProjectId = resolveContextProjectId(nextContext)
      const pendingPersistedContextEvent = pendingPersistedContextEventRef.current

      if (nextContext?.mode === 'new') {
        if (pendingPersistedContextEvent?.mode === 'new') {
          pendingPersistedContextEventRef.current = null
          return
        }
      } else if (nextContext?.mode === 'project') {
        if (
          pendingPersistedContextEvent?.mode === 'project' &&
          pendingPersistedContextEvent.projectId === nextContext.projectId
        ) {
          pendingPersistedContextEventRef.current = null
          return
        }
      }

      setActiveProjectContext(nextProjectId, {
        hydrate: Boolean(nextProjectId),
        persist: false,
      })
    }

    window.addEventListener(
      SELECTION_ACTIVE_CONTEXT_CHANGE_EVENT,
      handleSelectionActiveContextChange as EventListener,
    )

    return () => {
      window.removeEventListener(
        SELECTION_ACTIVE_CONTEXT_CHANGE_EVENT,
        handleSelectionActiveContextChange as EventListener,
      )
    }
  }, [setActiveProjectContext])

  useEffect(() => {
    if (!initialActiveProjectId || authLoading || !canUsePrivateFeatures) {
      return
    }

    void hydrateProjectSelection(initialActiveProjectId)
  }, [authLoading, hydrateProjectSelection, initialActiveProjectId, canUsePrivateFeatures])

  useEffect(() => {
    if (!canUsePrivateFeatures) setIsDrawerOpen(false)
    if (authLoading || canUsePrivateFeatures) {
      return
    }

    // A project context belongs to the signed-in user. Public selections remain intact.
    hydrationRequestIdRef.current += 1
    activeProjectIdRef.current = null
    projectSelectionVersionsRef.current = {}
    projectSelectionDirtyRef.current = {}
    projectSelectionEmptyIntentRef.current = {}
    projectSelectionConfirmedVersionsRef.current = {}
    projectSelectionConfirmedAtRef.current = {}
    projectSelectionsRef.current = {}
    projectSelectionSyncQueueRef.current?.clear()
    activeHydrationProjectIdRef.current = null
    pendingPersistedContextEventRef.current = null
    setActiveProjectId(null)
    setProjectSelections({})
    setIsHydratingActiveProjectSelection(false)
    setSelectionStatus('idle')
    setSelectionError(null)

    if (restoreSelectionActiveContext()?.mode === 'project') {
      persistSelectionActiveContext({ mode: 'new' })
    }
  }, [authLoading, canUsePrivateFeatures])

  const addImage = useCallback((image: SelectedLocationImage) => {
    if (isMutationLocked) {
      return
    }

    const normalizedImage = normalizeImages([image])[0]

    if (!normalizedImage) {
      return
    }

    const projectId = activeProjectIdRef.current

    if (projectId) {
      applyLocalProjectSelectionUpdate(projectId, (currentImages) => [
        ...currentImages,
        normalizedImage,
      ], 'add_image')
      return
    }

    setPendingSelectionImages((currentImages) =>
      normalizeImages([...currentImages, normalizedImage]),
    )
    setActiveProjectContext(null, {
      hydrate: false,
      persist: true,
    })
    setIsDrawerOpen(true)
  }, [applyLocalProjectSelectionUpdate, isMutationLocked, setActiveProjectContext])

  const replaceSelection = useCallback((
    nextImages: SelectedLocationImage[],
    options: ReplaceSelectionOptions = {},
  ) => {
    const normalizedImages = normalizeImages(nextImages)
    const projectId =
      options.projectId === undefined
        ? activeProjectIdRef.current
        : normalizeProjectId(options.projectId)

    if (projectId) {
      if (isMutationLocked && options.source !== 'remote') {
        return false
      }

      if (
        options.source === 'remote' &&
        !canApplyRemoteProjectSelection(
          projectId,
          options.expectedVersion ?? 0,
          normalizedImages.length,
        )
      ) {
        logSelectionDebugEvent('replace_selection_remote', {
          projectId,
          source: 'remote',
          details: {
            didApply: false,
            expectedVersion: options.expectedVersion ?? 0,
            nextCount: normalizedImages.length,
            localEmptyIntent: getProjectSelectionEmptyIntent(projectId),
          },
        })
        return false
      }

      if (options.source === 'remote') {
        const previousCount = projectSelectionsRef.current[projectId]?.length ?? 0
        const nextProjectSelections = {
          ...projectSelectionsRef.current,
          [projectId]: normalizedImages,
        }

        projectSelectionsRef.current = nextProjectSelections
        setProjectSelections(nextProjectSelections)
        markProjectSelectionRemoteHydrated(projectId)
        logSelectionCountTransition(
          'replace_selection_remote',
          projectId,
          previousCount,
          normalizedImages.length,
          {
            expectedVersion: options.expectedVersion ?? 0,
            didApply: true,
            emptyIntent: null,
          },
        )
      } else {
        applyLocalProjectSelectionUpdate(
          projectId,
          () => normalizedImages,
          'replace_selection_local',
          {
            emptyIntent: normalizedImages.length === 0 ? 'unknown-empty' : null,
          },
        )
      }
      return true
    }

    setGlobalImages(normalizedImages)
    return true
  }, [
    canApplyRemoteProjectSelection,
    applyLocalProjectSelectionUpdate,
    getProjectSelectionEmptyIntent,
    isMutationLocked,
    logSelectionCountTransition,
    logSelectionDebugEvent,
    markProjectSelectionRemoteHydrated,
  ])

  const removeImage = useCallback((key: string) => {
    if (isMutationLocked) {
      return
    }

    const projectId = activeProjectIdRef.current

    if (projectId) {
      applyLocalProjectSelectionUpdate(
        projectId,
        (currentImages) => currentImages.filter((image) => image.key !== key),
        'remove_image',
        {
          emptyIntent: 'explicit-clear',
        },
      )
      return
    }

    setGlobalImages((currentImages) =>
      currentImages.filter((image) => image.key !== key),
    )
  }, [applyLocalProjectSelectionUpdate, isMutationLocked])

  const clearSelection = useCallback((
    options: ClearSelectionOptions = {},
  ) => {
    if (isMutationLocked) {
      return
    }

    const projectId =
      options.projectId === undefined
        ? activeProjectIdRef.current
        : normalizeProjectId(options.projectId)

    if (projectId) {
      applyLocalProjectSelectionUpdate(projectId, () => [], 'clear_selection', {
        emptyIntent: 'explicit-clear',
      })
      return
    }

    setGlobalImages([])
  }, [applyLocalProjectSelectionUpdate, isMutationLocked])

  const isSelected = useCallback(
    (key: string) => images.some((image) => image.key === key),
    [images],
  )

  const clearPendingSelectionIntent = useCallback(() => {
    setPendingSelectionImages([])
  }, [])

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true)
  }, [])

  const closeDrawer = useCallback(() => {
    if (!activeProjectIdRef.current) {
      setPendingSelectionImages([])
    }
    setIsDrawerOpen(false)
  }, [])

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((currentValue) => {
      const nextValue = !currentValue

      if (!nextValue && !activeProjectIdRef.current) {
        setPendingSelectionImages([])
      }

      return nextValue
    })
  }, [])

  const value = useMemo<ImageSelectionContextValue>(
    () => ({
      activeProjectId,
      images,
      pendingSelectionImages,
      status: selectionStatus,
      error: selectionError,
      dirty,
      version,
      confirmedVersion,
      confirmedSelection: activeProjectId && !dirty && confirmedVersion === version
        ? {
            projectId: activeProjectId,
            images,
            version,
            confirmedAt:
              projectSelectionConfirmedAtRef.current[activeProjectId] ??
              new Date().toISOString(),
          }
        : null,
      isMutationLocked,
      isDrawerOpen,
      isHydratingActiveProjectSelection,
      isProjectSelectionPendingResolution,
      hasProjectSelection,
      getProjectSelection,
      addImage,
      replaceSelection,
      removeImage,
      clearSelection,
      isSelected,
      getProjectSelectionVersion,
      getProjectSelectionDebugState,
      getProjectSelectionEmptyIntent,
      markProjectSelectionSynced,
      setActiveProjectContext,
      selectProject,
      loadProjectSelection,
      flushSelection,
      lockSelectionMutations,
      unlockSelectionMutations,
      clearPendingSelectionIntent,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }),
    [
      activeProjectId,
      addImage,
      clearSelection,
      clearPendingSelectionIntent,
      closeDrawer,
      confirmedVersion,
      dirty,
      flushSelection,
      getProjectSelectionVersion,
      getProjectSelectionDebugState,
      getProjectSelectionEmptyIntent,
      getProjectSelection,
      hasProjectSelection,
      images,
      isDrawerOpen,
      isHydratingActiveProjectSelection,
      isMutationLocked,
      isProjectSelectionPendingResolution,
      isSelected,
      loadProjectSelection,
      lockSelectionMutations,
      openDrawer,
      pendingSelectionImages,
      removeImage,
      replaceSelection,
      markProjectSelectionSynced,
      selectProject,
      selectionError,
      selectionStatus,
      setActiveProjectContext,
      toggleDrawer,
      unlockSelectionMutations,
      version,
    ],
  )

  return (
    <ImageSelectionContext.Provider value={value}>
      {children}
    </ImageSelectionContext.Provider>
  )
}

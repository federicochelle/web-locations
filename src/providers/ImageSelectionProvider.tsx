import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import type { SelectedLocationImage } from '@/types/image-selection.ts'
import {
  clearImageSelectionStorage,
  persistImageSelectionCache,
  restoreImageSelectionCache,
} from '@/utils/image-selection-storage.ts'
import {
  persistSelectionActiveContext,
  restoreSelectionActiveContext,
  SELECTION_ACTIVE_CONTEXT_CHANGE_EVENT,
  type SelectionActiveContext,
} from '@/utils/selection-active-context-storage.ts'
import { fetchProjectSelectionImages } from '@/utils/selection-project-images.ts'

type ReplaceSelectionOptions = {
  projectId?: string | null
}

type ClearSelectionOptions = {
  projectId?: string | null
}

type SetActiveProjectContextOptions = {
  hydrate?: boolean
  persist?: boolean
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
  isDrawerOpen: boolean
  isHydratingActiveProjectSelection: boolean
  hasProjectSelection: (projectId: string | null | undefined) => boolean
  getProjectSelection: (
    projectId: string | null | undefined,
  ) => SelectedLocationImage[] | null
  addImage: (image: SelectedLocationImage) => void
  replaceSelection: (
    images: SelectedLocationImage[],
    options?: ReplaceSelectionOptions,
  ) => void
  removeImage: (key: string) => void
  clearSelection: (options?: ClearSelectionOptions) => void
  isSelected: (key: string) => boolean
  setActiveProjectContext: (
    projectId: string | null,
    options?: SetActiveProjectContextOptions,
  ) => void
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

function resolveContextProjectId(context: SelectionActiveContext | null) {
  return context?.mode === 'project' ? context.projectId : null
}

export const ImageSelectionContext = createContext<ImageSelectionContextValue | undefined>(
  undefined,
)

export function ImageSelectionProvider({
  children,
}: ImageSelectionProviderProps) {
  const initialSelectionCache = useMemo(() => restoreImageSelectionCache(), [])
  const initialActiveProjectId = useMemo(
    () => resolveContextProjectId(restoreSelectionActiveContext()),
    [],
  )
  const [globalImages, setGlobalImages] = useState(initialSelectionCache.globalImages)
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
  const activeProjectIdRef = useRef<string | null>(initialActiveProjectId)
  const hydrationRequestIdRef = useRef(0)
  const pendingPersistedContextEventRef = useRef<PendingPersistedContextEvent | null>(null)
  const projectSelectionVersionsRef = useRef<Record<string, number>>({})

  const images = activeProjectId
    ? projectSelections[activeProjectId] ?? []
    : globalImages

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId
  }, [activeProjectId])

  useEffect(() => {
    const hasProjectSelections = Object.keys(projectSelections).length > 0

    if (globalImages.length === 0 && !hasProjectSelections) {
      clearImageSelectionStorage()
      return
    }

    persistImageSelectionCache({
      globalImages,
      projectSelections,
    })
  }, [globalImages, projectSelections])

  const markProjectSelectionUpdated = useCallback((projectId: string) => {
    projectSelectionVersionsRef.current = {
      ...projectSelectionVersionsRef.current,
      [projectId]: (projectSelectionVersionsRef.current[projectId] ?? 0) + 1,
    }
  }, [])

  const hydrateProjectSelection = useCallback(async (projectId: string) => {
    const requestId = hydrationRequestIdRef.current + 1
    const selectionVersionAtRequestStart =
      projectSelectionVersionsRef.current[projectId] ?? 0
    hydrationRequestIdRef.current = requestId
    setIsHydratingActiveProjectSelection(true)

    try {
      const nextSelection = await fetchProjectSelectionImages(projectId)

      if (
        hydrationRequestIdRef.current !== requestId ||
        activeProjectIdRef.current !== projectId ||
        (projectSelectionVersionsRef.current[projectId] ?? 0) !== selectionVersionAtRequestStart
      ) {
        return
      }

      setProjectSelections((currentSelections) => ({
        ...currentSelections,
        [projectId]: normalizeImages(nextSelection),
      }))
      markProjectSelectionUpdated(projectId)
    } finally {
      if (
        hydrationRequestIdRef.current === requestId &&
        activeProjectIdRef.current === projectId
      ) {
        setIsHydratingActiveProjectSelection(false)
      }
    }
  }, [markProjectSelectionUpdated])

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
    const shouldHydrate = options.hydrate ?? Boolean(normalizedProjectId)
    const shouldPersist = options.persist ?? true

    hydrationRequestIdRef.current += 1
    setActiveProjectId(normalizedProjectId)

    if (!normalizedProjectId) {
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
  }, [hydrateProjectSelection])

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

          if (!pendingPersistedContextEvent.hydrate) {
            return
          }
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
    if (!initialActiveProjectId) {
      return
    }

    void hydrateProjectSelection(initialActiveProjectId)
  }, [hydrateProjectSelection, initialActiveProjectId])

  const addImage = useCallback((image: SelectedLocationImage) => {
    const normalizedImage = normalizeImages([image])[0]

    if (!normalizedImage) {
      return
    }

    const projectId = activeProjectIdRef.current

    if (projectId) {
      setProjectSelections((currentSelections) => ({
        ...currentSelections,
        [projectId]: normalizeImages([
          ...(currentSelections[projectId] ?? []),
          normalizedImage,
        ]),
      }))
      markProjectSelectionUpdated(projectId)
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
  }, [setActiveProjectContext])

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
      setProjectSelections((currentSelections) => ({
        ...currentSelections,
        [projectId]: normalizedImages,
      }))
      markProjectSelectionUpdated(projectId)
      return
    }

    setGlobalImages(normalizedImages)
  }, [])

  const removeImage = useCallback((key: string) => {
    const projectId = activeProjectIdRef.current

    if (projectId) {
      setProjectSelections((currentSelections) => ({
        ...currentSelections,
        [projectId]: (currentSelections[projectId] ?? []).filter(
          (image) => image.key !== key,
        ),
      }))
      markProjectSelectionUpdated(projectId)
      return
    }

    setGlobalImages((currentImages) =>
      currentImages.filter((image) => image.key !== key),
    )
  }, [])

  const clearSelection = useCallback((
    options: ClearSelectionOptions = {},
  ) => {
    const projectId =
      options.projectId === undefined
        ? activeProjectIdRef.current
        : normalizeProjectId(options.projectId)

    if (projectId) {
      setProjectSelections((currentSelections) => ({
        ...currentSelections,
        [projectId]: [],
      }))
      markProjectSelectionUpdated(projectId)
      return
    }

    setGlobalImages([])
  }, [])

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
      isDrawerOpen,
      isHydratingActiveProjectSelection,
      hasProjectSelection,
      getProjectSelection,
      addImage,
      replaceSelection,
      removeImage,
      clearSelection,
      isSelected,
      setActiveProjectContext,
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
      getProjectSelection,
      hasProjectSelection,
      images,
      isDrawerOpen,
      isHydratingActiveProjectSelection,
      isSelected,
      openDrawer,
      pendingSelectionImages,
      removeImage,
      replaceSelection,
      setActiveProjectContext,
      toggleDrawer,
    ],
  )

  return (
    <ImageSelectionContext.Provider value={value}>
      {children}
    </ImageSelectionContext.Provider>
  )
}

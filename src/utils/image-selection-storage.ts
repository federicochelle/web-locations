import type { SelectedLocationImage } from '@/types/image-selection.ts'

export const IMAGE_SELECTION_STORAGE_KEY = 'public-image-selection:v1'

const MAX_SELECTED_IMAGES = 80

export type ImageSelectionCache = {
  globalImages: SelectedLocationImage[]
  projectSelections: Record<string, SelectedLocationImage[]>
  projectSelectionState: Record<string, ProjectSelectionState>
}

export type ProjectSelectionEmptyIntent = 'explicit-clear' | 'unknown-empty' | null

export type ProjectSelectionState = {
  dirty: boolean
  version: number
  emptyIntent: ProjectSelectionEmptyIntent
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string'
}

function isSelectedLocationImage(value: unknown): value is SelectedLocationImage {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isNonEmptyString(candidate.key) &&
    isNonEmptyString(candidate.imageUrl) &&
    isOptionalNullableString(candidate.locationImageId) &&
    isNullableNumber(candidate.sortOrder) &&
    isNonEmptyString(candidate.locationId) &&
    isNonEmptyString(candidate.locationCode) &&
    isNonEmptyString(candidate.locationTitle) &&
    typeof candidate.categorySlug === 'string' &&
    isNonEmptyString(candidate.selectedAt)
  )
}

function dedupeImages(images: SelectedLocationImage[]) {
  const uniqueImages = new Map<string, SelectedLocationImage>()

  for (const image of images) {
    if (uniqueImages.has(image.key)) {
      continue
    }

    uniqueImages.set(image.key, image)
  }

  return [...uniqueImages.values()].slice(0, MAX_SELECTED_IMAGES)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sanitizeProjectSelections(
  value: unknown,
): Record<string, SelectedLocationImage[]> {
  if (!isRecord(value)) {
    return {}
  }

  const nextSelections: Record<string, SelectedLocationImage[]> = {}

  for (const [projectId, images] of Object.entries(value)) {
    if (!isNonEmptyString(projectId) || !Array.isArray(images)) {
      continue
    }

    nextSelections[projectId] = dedupeImages(images.filter(isSelectedLocationImage))
  }

  return nextSelections
}

function isProjectSelectionState(value: unknown): value is ProjectSelectionState {
  if (!isRecord(value)) {
    return false
  }

  return typeof value.dirty === 'boolean' && typeof value.version === 'number'
}

function sanitizeProjectSelectionEmptyIntent(
  value: unknown,
  imageCount: number,
): ProjectSelectionEmptyIntent {
  if (imageCount > 0) {
    return null
  }

  return value === 'explicit-clear' ? 'explicit-clear' : 'unknown-empty'
}

function sanitizeProjectSelectionState(
  value: unknown,
  projectSelections: Record<string, SelectedLocationImage[]>,
): Record<string, ProjectSelectionState> {
  const nextState: Record<string, ProjectSelectionState> = {}
  const stateRecord = isRecord(value) ? value : {}

  for (const projectId of Object.keys(projectSelections)) {
    const storedState = stateRecord[projectId]

    if (isProjectSelectionState(storedState)) {
      nextState[projectId] = {
        dirty: storedState.dirty,
        version: Number.isFinite(storedState.version) ? storedState.version : 0,
        emptyIntent: sanitizeProjectSelectionEmptyIntent(
          storedState.emptyIntent,
          projectSelections[projectId]?.length ?? 0,
        ),
      }
      continue
    }

    nextState[projectId] = {
      dirty: true,
      version: 0,
      emptyIntent: sanitizeProjectSelectionEmptyIntent(
        null,
        projectSelections[projectId]?.length ?? 0,
      ),
    }
  }

  return nextState
}

export function restoreImageSelectionCache(): ImageSelectionCache {
  if (typeof window === 'undefined') {
    return {
      globalImages: [],
      projectSelections: {},
      projectSelectionState: {},
    }
  }

  try {
    const rawValue = window.localStorage.getItem(IMAGE_SELECTION_STORAGE_KEY)

    if (!rawValue) {
      return {
        globalImages: [],
        projectSelections: {},
        projectSelectionState: {},
      }
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (Array.isArray(parsedValue)) {
      const validImages = parsedValue.filter(isSelectedLocationImage)

      return {
        globalImages: dedupeImages(validImages),
        projectSelections: {},
        projectSelectionState: {},
      }
    }

    if (!isRecord(parsedValue)) {
      return {
        globalImages: [],
        projectSelections: {},
        projectSelectionState: {},
      }
    }

    const globalImages = Array.isArray(parsedValue.globalImages)
      ? dedupeImages(parsedValue.globalImages.filter(isSelectedLocationImage))
      : []

    const projectSelections = sanitizeProjectSelections(parsedValue.projectSelections)

    return {
      globalImages,
      projectSelections,
      projectSelectionState: sanitizeProjectSelectionState(
        parsedValue.projectSelectionState,
        projectSelections,
      ),
    }
  } catch {
    return {
      globalImages: [],
      projectSelections: {},
      projectSelectionState: {},
    }
  }
}

export function persistImageSelectionCache(cache: ImageSelectionCache) {
  if (typeof window === 'undefined') {
    return
  }

  const nextGlobalImages = dedupeImages(cache.globalImages)
  const nextProjectSelections = sanitizeProjectSelections(cache.projectSelections)
  const nextProjectSelectionState = sanitizeProjectSelectionState(
    cache.projectSelectionState,
    nextProjectSelections,
  )

  try {
    window.localStorage.setItem(
      IMAGE_SELECTION_STORAGE_KEY,
      JSON.stringify({
        globalImages: nextGlobalImages,
        projectSelections: nextProjectSelections,
        projectSelectionState: nextProjectSelectionState,
      }),
    )
  } catch {
    // Local selection persistence is a best-effort backup.
  }
}

export function clearImageSelectionStorage() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(IMAGE_SELECTION_STORAGE_KEY)
  } catch {
    // Local selection persistence is a best-effort backup.
  }
}

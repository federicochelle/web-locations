import type { SelectedLocationImage } from '@/types/image-selection.ts'

export const IMAGE_SELECTION_STORAGE_KEY = 'public-image-selection:v1'

const MAX_SELECTED_IMAGES = 80

export type ImageSelectionCache = {
  globalImages: SelectedLocationImage[]
  projectSelections: Record<string, SelectedLocationImage[]>
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || value === null || isNonEmptyString(value)
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
    isNonEmptyString(candidate.categorySlug) &&
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

    const validImages = images.filter(isSelectedLocationImage)

    if (validImages.length === 0) {
      continue
    }

    nextSelections[projectId] = dedupeImages(validImages)
  }

  return nextSelections
}

export function restoreImageSelectionCache(): ImageSelectionCache {
  if (typeof window === 'undefined') {
    return {
      globalImages: [],
      projectSelections: {},
    }
  }

  try {
    const rawValue = window.localStorage.getItem(IMAGE_SELECTION_STORAGE_KEY)

    if (!rawValue) {
      return {
        globalImages: [],
        projectSelections: {},
      }
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (Array.isArray(parsedValue)) {
      const validImages = parsedValue.filter(isSelectedLocationImage)

      return {
        globalImages: dedupeImages(validImages),
        projectSelections: {},
      }
    }

    if (!isRecord(parsedValue)) {
      return {
        globalImages: [],
        projectSelections: {},
      }
    }

    const globalImages = Array.isArray(parsedValue.globalImages)
      ? dedupeImages(parsedValue.globalImages.filter(isSelectedLocationImage))
      : []

    return {
      globalImages,
      projectSelections: sanitizeProjectSelections(parsedValue.projectSelections),
    }
  } catch {
    return {
      globalImages: [],
      projectSelections: {},
    }
  }
}

export function persistImageSelectionCache(cache: ImageSelectionCache) {
  if (typeof window === 'undefined') {
    return
  }

  const nextGlobalImages = dedupeImages(cache.globalImages)
  const nextProjectSelections = sanitizeProjectSelections(cache.projectSelections)

  window.localStorage.setItem(
    IMAGE_SELECTION_STORAGE_KEY,
    JSON.stringify({
      globalImages: nextGlobalImages,
      projectSelections: nextProjectSelections,
    }),
  )
}

export function clearImageSelectionStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(IMAGE_SELECTION_STORAGE_KEY)
}

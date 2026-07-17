import type { SelectedLocationImage } from '@/types/image-selection.ts'

export const IMAGE_SELECTION_STORAGE_KEY = 'public-image-selection:v1'

const MAX_SELECTED_IMAGES = 30

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

export function restoreImageSelection(): SelectedLocationImage[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(IMAGE_SELECTION_STORAGE_KEY)

    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (!Array.isArray(parsedValue)) {
      return []
    }

    const validImages = parsedValue.filter(isSelectedLocationImage)
    return dedupeImages(validImages)
  } catch {
    return []
  }
}

export function persistImageSelection(images: SelectedLocationImage[]) {
  if (typeof window === 'undefined') {
    return
  }

  const nextImages = dedupeImages(images)
  window.localStorage.setItem(
    IMAGE_SELECTION_STORAGE_KEY,
    JSON.stringify(nextImages),
  )
}

export function clearImageSelectionStorage() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(IMAGE_SELECTION_STORAGE_KEY)
}

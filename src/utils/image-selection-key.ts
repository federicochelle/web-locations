type ImageSelectionKeyInput = {
  locationId: string
  locationImageId?: string | null
  imageUrl: string
}

function normalizeKeyPart(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

export function getImageSelectionKey({
  locationId,
  locationImageId,
  imageUrl,
}: ImageSelectionKeyInput) {
  const normalizedLocationId = normalizeKeyPart(locationId)
  const normalizedLocationImageId = normalizeKeyPart(locationImageId)
  const normalizedImageUrl = normalizeKeyPart(imageUrl)

  return `${normalizedLocationId}:${normalizedLocationImageId || normalizedImageUrl}`
}

const LOCATION_CODE_PATTERN = /^[A-Z]{2,}-\d{2,}$/i
const NATURAL_LANGUAGE_MARKERS = [
  'quiero',
  'busco',
  'algo',
  'lugar',
  'espacio',
  'con ',
  'para ',
  'que ',
  'medio ',
  'mucha ',
  'mucho ',
  'pero ',
]

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ')
}

export function shouldInterpretSearchQuery(query: string): boolean {
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) {
    return false
  }

  if (LOCATION_CODE_PATTERN.test(normalizedQuery)) {
    return false
  }

  const words = normalizedQuery.split(' ').filter((word) => word.length > 0)

  if (words.length <= 1) {
    return false
  }

  if (words.length === 2) {
    return false
  }

  if (words.length >= 4) {
    return true
  }

  const lowerQuery = normalizedQuery.toLowerCase()

  return NATURAL_LANGUAGE_MARKERS.some((marker) => lowerQuery.includes(marker))
}

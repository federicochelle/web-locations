export type SearchInterpretation = {
  coreQuery: string
  optionalTerms: string[]
  categorySlugs: string[]
  featureSlugs: string[]
  tagSlugs: string[]
  freeTextTerms: string[]
}

export type SearchInterpretationFallbackReason =
  | 'timeout'
  | 'http-error'
  | 'invalid-payload'
  | 'empty-core-query'

export type SearchInterpretationSnapshot = {
  rawQuery: string
  coreQuery: string
  optionalTerms: string[]
  categorySlugs: string[]
  featureSlugs: string[]
  tagSlugs: string[]
  freeTextTerms: string[]
  usedAi: boolean
  fallback: boolean
  fallbackReason: SearchInterpretationFallbackReason | null
  durationMs: number
}

export type UseLocationSearchInterpretationOptions = {
  enabled?: boolean
  query: string
}

export type UseLocationSearchInterpretationResult = SearchInterpretationSnapshot & {
  loading: boolean
  shouldUseAi: boolean
}

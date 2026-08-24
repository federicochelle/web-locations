export type SearchInterpretation = {
  coreQuery: string
  optionalTerms: string[]
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

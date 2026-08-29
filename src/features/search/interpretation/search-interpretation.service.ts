import { supabase } from '@/lib/supabase.ts'

import type {
  SearchInterpretation,
  SearchInterpretationFallbackReason,
} from '@/features/search/interpretation/search-interpretation.types.ts'

const SEARCH_QUERY_ANALYSIS_TIMEOUT_MS = 6000

class SearchInterpretationError extends Error {
  fallbackReason: SearchInterpretationFallbackReason

  constructor(message: string, fallbackReason: SearchInterpretationFallbackReason) {
    super(message)
    this.name = 'SearchInterpretationError'
    this.fallbackReason = fallbackReason
  }
}

function isSearchInterpretation(value: unknown): value is SearchInterpretation {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<SearchInterpretation> & {
    categorySlugs?: unknown
    featureSlugs?: unknown
    tagSlugs?: unknown
    freeTextTerms?: unknown
  }

  const hasValidStringArray = (entry: unknown) =>
    entry === undefined || (Array.isArray(entry) && entry.every((term) => typeof term === 'string'))

  return (
    typeof candidate.coreQuery === 'string' &&
    Array.isArray(candidate.optionalTerms) &&
    candidate.optionalTerms.every((term) => typeof term === 'string') &&
    hasValidStringArray(candidate.categorySlugs) &&
    hasValidStringArray(candidate.featureSlugs) &&
    hasValidStringArray(candidate.tagSlugs) &&
    hasValidStringArray(candidate.freeTextTerms)
  )
}

function normalizeStringArray(value: string[] | undefined, limit?: number) {
  const normalized = [...new Set(
    (value ?? [])
      .map((term) => term.trim())
      .filter((term) => term.length > 0),
  )]

  return typeof limit === 'number' ? normalized.slice(0, limit) : normalized
}

function parseFunctionError(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

export async function interpretLocationSearchQuery(
  query: string,
): Promise<SearchInterpretation> {
  let timeoutId: number | null = null
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new SearchInterpretationError('Search interpretation timed out.', 'timeout'))
    }, SEARCH_QUERY_ANALYSIS_TIMEOUT_MS)
  })

  const requestPromise = (async () => {
    const { data, error } = await supabase.functions.invoke('search-query-analysis', {
      body: {
        query,
      },
    })

    if (error) {
      throw new SearchInterpretationError(
        parseFunctionError(error, 'No pudimos interpretar la busqueda.'),
        'http-error',
      )
    }

    if (isSearchInterpretation(data)) {
      const coreQuery = data.coreQuery.trim()
      const optionalTerms = normalizeStringArray(data.optionalTerms, 3)
      const categorySlugs = normalizeStringArray(data.categorySlugs)
      const featureSlugs = normalizeStringArray(data.featureSlugs)
      const tagSlugs = normalizeStringArray(data.tagSlugs)
      const freeTextTerms = normalizeStringArray(data.freeTextTerms)

      if (!coreQuery) {
        throw new SearchInterpretationError(
          'Search interpretation returned an empty core query.',
          'empty-core-query',
        )
      }

      return {
        coreQuery,
        optionalTerms,
        categorySlugs,
        featureSlugs,
        tagSlugs,
        freeTextTerms,
      }
    }

    const response = data as { error?: string } | null
    throw new SearchInterpretationError(
      response?.error || 'No pudimos interpretar la busqueda.',
      'invalid-payload',
    )
  })()

  try {
    return await Promise.race([requestPromise, timeoutPromise])
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId)
    }
  }
}

export function getSearchInterpretationFallbackReason(error: unknown) {
  if (error instanceof SearchInterpretationError) {
    return error.fallbackReason
  }

  return 'http-error' satisfies SearchInterpretationFallbackReason
}

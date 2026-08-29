import { useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase.ts'
import {
  enrichLocationsWithCategorySlugs,
  mapSearchPublicLocationsRow,
  type SearchPublicLocationsRow,
} from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

import {
  searchSupabaseLocationCardsV3,
} from '@/features/search/supabase/useSupabaseLocationSearchV3.ts'

type StructuredSearchParams = {
  categorySlugs: string[]
  coreQuery: string
  departmentSlug: string
  featureSlugs: string[]
  freeTextTerms: string[]
  limit: number
  tagSlugs: string[]
}

type UseSupabaseLocationSearchV4Options = {
  categorySlugs?: string[]
  coreQuery?: string
  departmentSlug?: string
  enabled?: boolean
  featureSlugs?: string[]
  freeTextTerms?: string[]
  limit?: number
  optionalTerms?: string[]
  tagSlugs?: string[]
}

type UseSupabaseLocationSearchV4Result = {
  currentRequestKey: string | null
  error: string | null
  fallbackToV3: boolean
  hits: PublicLocationCard[]
  loading: boolean
  searchMode: 'strict' | 'related' | 'v3-fallback' | null
  searchTimeMs: number | null
  settledRequestKey: string | null
  totalHits: number
  usedRelated: boolean
}

type SearchPublicLocationsV4Row = SearchPublicLocationsRow & {
  match_reason?: string | null
  search_score?: number | null
}

const EMPTY_STRING_ARRAY: string[] = []

function normalizeStringArray(values: string[] | undefined) {
  return [...new Set(
    (values ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  )]
}

function buildRequestKey(params: StructuredSearchParams) {
  return JSON.stringify(params)
}

async function searchSupabaseLocationsV4Rpc(
  rpcName: 'search_public_locations_v4' | 'search_public_locations_v4_related',
  params: StructuredSearchParams,
) {
  const { data, error: rpcError } = await supabase.rpc(rpcName, {
    p_category_slugs: params.categorySlugs,
    p_core_query: params.coreQuery || null,
    p_department_slug: params.departmentSlug || null,
    p_feature_slugs: params.featureSlugs,
    p_free_text_terms: params.freeTextTerms,
    p_limit: params.limit,
    p_tag_slugs: params.tagSlugs,
  })

  if (rpcError) {
    throw new Error(rpcError.message)
  }

  const rows = (data ?? []) as SearchPublicLocationsV4Row[]
  const rowsWithCategorySlugs = await enrichLocationsWithCategorySlugs(rows, null)

  return {
    hits: rowsWithCategorySlugs.map((row) => mapSearchPublicLocationRow(row)),
    totalHits: rowsWithCategorySlugs[0]?.total_count ?? 0,
  }
}

function mapSearchPublicLocationRow(row: SearchPublicLocationsV4Row) {
  return mapSearchPublicLocationsRow(row)
}

export async function searchSupabaseLocationCardsV4Strict(
  options: UseSupabaseLocationSearchV4Options = {},
) {
  const params = normalizeParams(options)
  const snapshot = await searchSupabaseLocationsV4Rpc('search_public_locations_v4', params)
  return snapshot.hits
}

export async function searchSupabaseLocationCardsV4Related(
  options: UseSupabaseLocationSearchV4Options = {},
) {
  const params = normalizeParams(options)
  const snapshot = await searchSupabaseLocationsV4Rpc('search_public_locations_v4_related', params)
  return snapshot.hits
}

function normalizeParams(options: UseSupabaseLocationSearchV4Options): StructuredSearchParams {
  return {
    categorySlugs: normalizeStringArray(options.categorySlugs),
    coreQuery: options.coreQuery?.trim() ?? '',
    departmentSlug: options.departmentSlug?.trim() ?? '',
    featureSlugs: normalizeStringArray(options.featureSlugs),
    freeTextTerms: normalizeStringArray(options.freeTextTerms),
    limit: Math.max(1, Math.trunc(options.limit ?? 100)),
    tagSlugs: normalizeStringArray(options.tagSlugs),
  }
}

export function useSupabaseLocationSearchV4(
  options: UseSupabaseLocationSearchV4Options = {},
): UseSupabaseLocationSearchV4Result {
  const {
    categorySlugs = EMPTY_STRING_ARRAY,
    coreQuery = '',
    departmentSlug = '',
    enabled = true,
    featureSlugs = EMPTY_STRING_ARRAY,
    freeTextTerms = EMPTY_STRING_ARRAY,
    limit = 100,
    optionalTerms = EMPTY_STRING_ARRAY,
    tagSlugs = EMPTY_STRING_ARRAY,
  } = options

  const [hits, setHits] = useState<PublicLocationCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null)
  const [totalHits, setTotalHits] = useState(0)
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState<'strict' | 'related' | 'v3-fallback' | null>(null)
  const [usedRelated, setUsedRelated] = useState(false)
  const [fallbackToV3, setFallbackToV3] = useState(false)
  const latestRequestKeyRef = useRef<string | null>(null)

  const normalizedParams = useMemo(
    () =>
      normalizeParams({
        categorySlugs,
        coreQuery,
        departmentSlug,
        featureSlugs,
        freeTextTerms,
        limit,
        tagSlugs,
      }),
    [categorySlugs, coreQuery, departmentSlug, featureSlugs, freeTextTerms, limit, tagSlugs],
  )

  const currentRequestKey = useMemo(() => {
    if (!enabled) {
      return null
    }

    return buildRequestKey(normalizedParams)
  }, [enabled, normalizedParams])

  useEffect(() => {
    if (!enabled) {
      latestRequestKeyRef.current = null
      setLoading(false)
      setError(null)
      setHits([])
      setSearchTimeMs(null)
      setTotalHits(0)
      setSearchMode(null)
      setUsedRelated(false)
      setFallbackToV3(false)
      return
    }

    let isCancelled = false
    const requestKey = buildRequestKey(normalizedParams)
    latestRequestKeyRef.current = requestKey

    async function runSearch() {
      const startedAt = performance.now()

      try {
        setLoading(true)
        setError(null)
        setUsedRelated(false)
        setFallbackToV3(false)

        const strictSnapshot = await searchSupabaseLocationsV4Rpc(
          'search_public_locations_v4',
          normalizedParams,
        )

        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        if (strictSnapshot.hits.length > 0) {
          setHits(strictSnapshot.hits)
          setTotalHits(strictSnapshot.totalHits)
          setSearchMode('strict')
          setSearchTimeMs(Math.round(performance.now() - startedAt))
          setSettledRequestKey(requestKey)
          return
        }

        const relatedSnapshot = await searchSupabaseLocationsV4Rpc(
          'search_public_locations_v4_related',
          {
            ...normalizedParams,
            limit: Math.min(normalizedParams.limit, 24),
          },
        )

        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits(relatedSnapshot.hits)
        setTotalHits(relatedSnapshot.totalHits)
        setUsedRelated(true)
        setSearchMode(relatedSnapshot.hits.length > 0 ? 'related' : 'related')
        setSearchTimeMs(Math.round(performance.now() - startedAt))
        setSettledRequestKey(requestKey)
      } catch (searchError) {
        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        try {
          const legacyHits = await searchSupabaseLocationCardsV3({
            coreQuery: normalizedParams.coreQuery,
            departmentSlug: normalizedParams.departmentSlug,
            limit: normalizedParams.limit,
            optionalTerms: normalizeStringArray(optionalTerms),
          })

          if (isCancelled || latestRequestKeyRef.current !== requestKey) {
            return
          }

          setHits(legacyHits)
          setTotalHits(legacyHits.length)
          setSearchMode('v3-fallback')
          setFallbackToV3(true)
          setSearchTimeMs(Math.round(performance.now() - startedAt))
          setSettledRequestKey(requestKey)
          setError(null)
        } catch (legacyError) {
          if (isCancelled || latestRequestKeyRef.current !== requestKey) {
            return
          }

          setHits([])
          setTotalHits(0)
          setSearchMode(null)
          setFallbackToV3(true)
          setSearchTimeMs(Math.round(performance.now() - startedAt))
          setSettledRequestKey(requestKey)
          setError(
            legacyError instanceof Error
              ? legacyError.message
              : searchError instanceof Error
                ? searchError.message
                : 'No se pudieron cargar los resultados de la búsqueda.',
          )
        }
      } finally {
        if (!isCancelled && latestRequestKeyRef.current === requestKey) {
          setLoading(false)
        }
      }
    }

    void runSearch()

    return () => {
      isCancelled = true
    }
  }, [enabled, normalizedParams, optionalTerms])

  return {
    currentRequestKey,
    error,
    fallbackToV3,
    hits,
    loading,
    searchMode,
    searchTimeMs,
    settledRequestKey,
    totalHits,
    usedRelated,
  }
}

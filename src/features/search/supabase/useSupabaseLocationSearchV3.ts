import { useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabase.ts'
import {
  enrichLocationsWithCategorySlugs,
  mapSearchPublicLocationsRow,
  type SearchPublicLocationsRow,
} from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

type UseSupabaseLocationSearchV3Options = {
  coreQuery?: string
  departmentSlug?: string
  enabled?: boolean
  limit?: number
  optionalTerms?: string[]
}

type UseSupabaseLocationSearchV3Result = {
  currentRequestKey: string | null
  error: string | null
  hits: PublicLocationCard[]
  loading: boolean
  searchTimeMs: number | null
  settledRequestKey: string | null
  totalHits: number
}

type SearchPublicLocationsV3Row = SearchPublicLocationsRow & {
  match_reason?: string | null
  search_score?: number | null
}

type SearchSupabaseLocationCardsV3Options = {
  coreQuery?: string
  departmentSlug?: string
  limit?: number
  optionalTerms?: string[]
}

type SearchSupabaseLocationCardsV3RelatedOptions = SearchSupabaseLocationCardsV3Options

const EMPTY_STRING_ARRAY: string[] = []

function normalizeOptionalTerms(optionalTerms: string[] | undefined) {
  return [...new Set(
    (optionalTerms ?? [])
      .map((term) => term.trim())
      .filter((term) => term.length > 0),
  )]
}

function buildSupabaseLocationSearchV3RequestKey(params: {
  coreQuery: string
  departmentSlug: string
  limit: number
  optionalTerms: string[]
}) {
  return JSON.stringify(params)
}

async function searchSupabaseLocationsV3(params: {
  coreQuery: string
  departmentSlug: string
  limit: number
  optionalTerms: string[]
}) {
  const { data, error: rpcError } = await supabase.rpc('search_public_locations_v3', {
    p_core_query: params.coreQuery || null,
    p_department_slug: params.departmentSlug || null,
    p_limit: params.limit,
    p_optional_terms: params.optionalTerms,
  })

  if (rpcError) {
    throw new Error(rpcError.message)
  }

  const rows = (data ?? []) as SearchPublicLocationsV3Row[]
  const rowsWithCategorySlugs = await enrichLocationsWithCategorySlugs(rows, null)

  return {
    hits: rowsWithCategorySlugs.map((row) => mapSearchPublicLocationsRow(row)),
    totalHits: rowsWithCategorySlugs[0]?.total_count ?? 0,
  }
}

async function searchSupabaseLocationsV3Related(params: {
  coreQuery: string
  departmentSlug: string
  limit: number
  optionalTerms: string[]
}) {
  const { data, error: rpcError } = await supabase.rpc('search_public_locations_v3_related', {
    p_core_query: params.coreQuery || null,
    p_department_slug: params.departmentSlug || null,
    p_limit: params.limit,
    p_optional_terms: params.optionalTerms,
  })

  if (rpcError) {
    throw new Error(rpcError.message)
  }

  const rows = (data ?? []) as SearchPublicLocationsV3Row[]
  const rowsWithCategorySlugs = await enrichLocationsWithCategorySlugs(rows, null)

  return {
    hits: rowsWithCategorySlugs.map((row) => mapSearchPublicLocationsRow(row)),
    totalHits: rowsWithCategorySlugs[0]?.total_count ?? 0,
  }
}

export async function searchSupabaseLocationCardsV3(
  options: SearchSupabaseLocationCardsV3Options = {},
): Promise<PublicLocationCard[]> {
  const normalizedCoreQuery = options.coreQuery?.trim() ?? ''
  const normalizedDepartmentSlug = options.departmentSlug?.trim() ?? ''
  const normalizedLimit = Math.max(1, Math.trunc(options.limit ?? 12))
  const normalizedOptionalTerms = normalizeOptionalTerms(options.optionalTerms)
  const snapshot = await searchSupabaseLocationsV3({
    coreQuery: normalizedCoreQuery,
    departmentSlug: normalizedDepartmentSlug,
    limit: normalizedLimit,
    optionalTerms: normalizedOptionalTerms,
  })

  return snapshot.hits
}

export async function searchSupabaseLocationCardsV3Related(
  options: SearchSupabaseLocationCardsV3RelatedOptions = {},
): Promise<PublicLocationCard[]> {
  const normalizedCoreQuery = options.coreQuery?.trim() ?? ''
  const normalizedDepartmentSlug = options.departmentSlug?.trim() ?? ''
  const normalizedLimit = Math.max(1, Math.trunc(options.limit ?? 12))
  const normalizedOptionalTerms = normalizeOptionalTerms(options.optionalTerms)
  const snapshot = await searchSupabaseLocationsV3Related({
    coreQuery: normalizedCoreQuery,
    departmentSlug: normalizedDepartmentSlug,
    limit: normalizedLimit,
    optionalTerms: normalizedOptionalTerms,
  })

  return snapshot.hits
}

export function useSupabaseLocationSearchV3(
  options: UseSupabaseLocationSearchV3Options = {},
): UseSupabaseLocationSearchV3Result {
  const {
    coreQuery = '',
    departmentSlug = '',
    enabled = true,
    limit = 100,
    optionalTerms = EMPTY_STRING_ARRAY,
  } = options

  const [hits, setHits] = useState<PublicLocationCard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null)
  const [totalHits, setTotalHits] = useState(0)
  const [settledRequestKey, setSettledRequestKey] = useState<string | null>(null)
  const latestRequestKeyRef = useRef<string | null>(null)
  const normalizedOptionalTerms = useMemo(
    () => normalizeOptionalTerms(optionalTerms),
    [optionalTerms],
  )
  const optionalTermsKey = JSON.stringify(normalizedOptionalTerms)
  const normalizedCoreQuery = coreQuery.trim()
  const normalizedDepartmentSlug = departmentSlug.trim()
  const normalizedLimit = Math.max(1, Math.trunc(limit))
  const currentRequestKey = useMemo(() => {
    if (!enabled) {
      return null
    }

    return buildSupabaseLocationSearchV3RequestKey({
      coreQuery: normalizedCoreQuery,
      departmentSlug: normalizedDepartmentSlug,
      limit: normalizedLimit,
      optionalTerms: normalizedOptionalTerms,
    })
  }, [
    enabled,
    normalizedCoreQuery,
    normalizedDepartmentSlug,
    normalizedLimit,
    normalizedOptionalTerms,
    optionalTermsKey,
  ])

  useEffect(() => {
    if (!enabled) {
      latestRequestKeyRef.current = null
      setError(null)
      setLoading(false)
      return
    }

    let isCancelled = false
    const requestKey = buildSupabaseLocationSearchV3RequestKey({
      coreQuery: normalizedCoreQuery,
      departmentSlug: normalizedDepartmentSlug,
      limit: normalizedLimit,
      optionalTerms: normalizedOptionalTerms,
    })

    latestRequestKeyRef.current = requestKey

    async function runSearch() {
      const startedAt = performance.now()

      try {
        setLoading(true)
        setError(null)

        const snapshot = await searchSupabaseLocationsV3({
          coreQuery: normalizedCoreQuery,
          departmentSlug: normalizedDepartmentSlug,
          limit: normalizedLimit,
          optionalTerms: normalizedOptionalTerms,
        })

        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits(snapshot.hits)
        setTotalHits(snapshot.totalHits)
        setSearchTimeMs(Math.round(performance.now() - startedAt))
        setSettledRequestKey(requestKey)
      } catch (searchError) {
        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits([])
        setTotalHits(0)
        setSearchTimeMs(null)
        setError(
          searchError instanceof Error
            ? searchError.message
            : 'No pudimos consultar la búsqueda pública en Supabase.',
        )
        setSettledRequestKey(requestKey)
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void runSearch()

    return () => {
      isCancelled = true
    }
  }, [
    enabled,
    normalizedCoreQuery,
    normalizedDepartmentSlug,
    normalizedLimit,
    normalizedOptionalTerms,
    optionalTermsKey,
  ])

  return {
    currentRequestKey,
    error,
    hits,
    loading,
    searchTimeMs,
    settledRequestKey,
    totalHits,
  }
}

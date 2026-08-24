import { useEffect, useMemo, useRef, useState } from 'react'

import { getAlgoliaSearchClient, getAlgoliaSearchConfig } from '@/features/search/algolia/algolia.client.ts'
import { mapAlgoliaHitToPublicLocationCard } from '@/features/search/algolia/algolia.mapper.ts'
import { supabase } from '@/lib/supabase.ts'
import type { AlgoliaLocationHit } from '@/features/search/algolia/algolia.types.ts'
import type { PublicLocationCard } from '@/types/location.ts'

type UseAlgoliaLocationSearchOptions = {
  departmentSlug?: string
  enabled?: boolean
  initialPage?: number
  initialQuery?: string
  optionalTerms?: string[]
  debounceMs?: number
  hitsPerPage?: number
}

type UseAlgoliaLocationSearchResult = {
  error: string | null
  hits: PublicLocationCard[]
  loading: boolean
  nextPage: () => void
  page: number
  previousPage: () => void
  query: string
  searchTimeMs: number | null
  setPage: (page: number) => void
  setQuery: (query: string) => void
  totalHits: number
  totalPages: number
}

type AlgoliaLocationSearchSnapshot = {
  hits: PublicLocationCard[]
  searchTimeMs: number | null
  totalHits: number
  totalPages: number
}

const algoliaSearchCache = new Map<string, AlgoliaLocationSearchSnapshot>()
const algoliaSearchInFlight = new Map<string, Promise<AlgoliaLocationSearchSnapshot>>()

function buildSearchRequestKey(params: {
  departmentSlug: string
  hitsPerPage: number
  optionalTerms: string[]
  page: number
  query: string
}) {
  return JSON.stringify(params)
}

function normalizeOptionalTerms(optionalTerms: string[] | undefined) {
  return [...new Set(
    (optionalTerms ?? [])
      .map((term) => term.trim())
      .filter((term) => term.length > 0),
  )].slice(0, 3)
}

async function filterPublishedAlgoliaHits(hits: AlgoliaLocationHit[]) {
  const locationIds = [...new Set(
    hits
      .map((hit) => hit.objectID?.trim())
      .filter((locationId): locationId is string => locationId.length > 0),
  )]

  if (locationIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .in('id', locationIds)
    .eq('published', true)

  if (error) {
    throw new Error(error.message)
  }

  const publishedIds = new Set(
    (data ?? [])
      .map((row) => row.id?.trim())
      .filter((locationId): locationId is string => Boolean(locationId)),
  )

  return hits.filter((hit) => publishedIds.has(hit.objectID))
}

async function searchAlgoliaLocations(params: {
  departmentSlug: string
  hitsPerPage: number
  optionalTerms: string[]
  page: number
  query: string
}): Promise<AlgoliaLocationSearchSnapshot> {
  const requestKey = buildSearchRequestKey(params)
  const cachedSnapshot = algoliaSearchCache.get(requestKey)

  if (cachedSnapshot) {
    return cachedSnapshot
  }

  const inFlightRequest = algoliaSearchInFlight.get(requestKey)

  if (inFlightRequest) {
    return inFlightRequest
  }

  const requestPromise = (async () => {
    const client = getAlgoliaSearchClient()
    const { indexName } = getAlgoliaSearchConfig()
    const response = await client.searchForHits<AlgoliaLocationHit>({
      requests: [
        {
          indexName,
          query: params.query,
          ...(params.optionalTerms.length > 0
            ? { optionalWords: params.optionalTerms }
            : {}),
          ...(params.departmentSlug
            ? { filters: `department_name:${JSON.stringify(params.departmentSlug)}` }
            : {}),
          page: Math.max(0, params.page - 1),
          hitsPerPage: params.hitsPerPage,
          attributesToRetrieve: [
            'objectID',
            'location_code',
            'slug',
            'category_slug',
            'category_name',
            'category_aliases',
            'department_slug',
            'department_name',
            'features',
            'feature_aliases',
            'tags',
            'short_description',
            'description',
            'cover_url',
          ],
        },
      ],
    })
    const firstResult = response.results[0]

    const snapshot: AlgoliaLocationSearchSnapshot = !firstResult
      ? {
          hits: [],
          searchTimeMs: null,
          totalHits: 0,
          totalPages: 0,
        }
      : {
          hits: (await filterPublishedAlgoliaHits(firstResult.hits)).map((hit: AlgoliaLocationHit) =>
            mapAlgoliaHitToPublicLocationCard(hit),
          ),
          searchTimeMs: firstResult.processingTimeMS ?? null,
          totalHits: firstResult.nbHits ?? 0,
          totalPages: firstResult.nbPages ?? 0,
        }

    algoliaSearchCache.set(requestKey, snapshot)
    return snapshot
  })()

  algoliaSearchInFlight.set(requestKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    algoliaSearchInFlight.delete(requestKey)
  }
}

export function useAlgoliaLocationSearch(
  options: UseAlgoliaLocationSearchOptions = {},
): UseAlgoliaLocationSearchResult {
  const {
    departmentSlug = '',
    enabled = true,
    initialPage = 1,
    initialQuery = '',
    optionalTerms = [],
    debounceMs = 350,
    hitsPerPage = 20,
  } = options

  const [query, setQueryState] = useState(initialQuery)
  const [page, setPageState] = useState(Math.max(1, initialPage))
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [hits, setHits] = useState<PublicLocationCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalHits, setTotalHits] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null)
  const latestRequestKeyRef = useRef<string | null>(null)
  const normalizedOptionalTerms = useMemo(
    () => normalizeOptionalTerms(optionalTerms),
    [optionalTerms],
  )
  const optionalTermsKey = JSON.stringify(normalizedOptionalTerms)

  useEffect(() => {
    setQueryState((currentQuery) =>
      currentQuery === initialQuery ? currentQuery : initialQuery,
    )
  }, [initialQuery])

  useEffect(() => {
    const normalizedInitialPage = Math.max(1, initialPage)
    setPageState((currentPage) =>
      currentPage === normalizedInitialPage ? currentPage : normalizedInitialPage,
    )
  }, [initialPage])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [debounceMs, query])

  useEffect(() => {
    if (!enabled) {
      latestRequestKeyRef.current = null
      setHits([])
      setSearchTimeMs(null)
      setTotalHits(0)
      setTotalPages(0)
      setError(null)
      setLoading(false)
      return
    }

    let isCancelled = false

    async function runSearch() {
      const requestKey = buildSearchRequestKey({
        departmentSlug,
        hitsPerPage,
        optionalTerms: normalizedOptionalTerms,
        page,
        query: debouncedQuery,
      })

      latestRequestKeyRef.current = requestKey

      try {
        setLoading(true)
        setError(null)

        const snapshot = await searchAlgoliaLocations({
          departmentSlug,
          hitsPerPage,
          optionalTerms: normalizedOptionalTerms,
          page,
          query: debouncedQuery,
        })

        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits(snapshot.hits)
        setTotalPages(snapshot.totalPages)
        setTotalHits(snapshot.totalHits)
        setSearchTimeMs(snapshot.searchTimeMs)
      } catch (searchError) {
        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits([])
        setSearchTimeMs(null)
        setTotalHits(0)
        setTotalPages(0)
        setError(
          searchError instanceof Error
            ? searchError.message
            : 'No pudimos consultar el índice experimental de Algolia.',
        )
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
  }, [debouncedQuery, departmentSlug, enabled, hitsPerPage, normalizedOptionalTerms, optionalTermsKey, page])

  function setQuery(nextQuery: string) {
    if (nextQuery === query) {
      return
    }

    setQueryState(nextQuery)
    setPageState((currentPage) => (currentPage === 1 ? currentPage : 1))
  }

  function setPage(nextPage: number) {
    const normalizedPage = Math.max(1, nextPage)
    setPageState((currentPage) =>
      currentPage === normalizedPage ? currentPage : normalizedPage,
    )
  }

  function nextPage() {
    setPageState((currentPage) =>
      totalPages > 0 ? Math.min(totalPages, currentPage + 1) : currentPage + 1,
    )
  }

  function previousPage() {
    setPageState((currentPage) => Math.max(1, currentPage - 1))
  }

  return {
    error,
    hits,
    loading,
    nextPage,
    page,
    previousPage,
    query,
    searchTimeMs,
    setPage,
    setQuery,
    totalHits,
    totalPages,
  }
}

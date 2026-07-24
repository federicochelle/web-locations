import { useEffect, useRef, useState } from 'react'

import { getAlgoliaSearchClient, getAlgoliaSearchConfig } from '@/features/search/algolia/algolia.client.ts'
import { mapAlgoliaHitToPublicLocationCard } from '@/features/search/algolia/algolia.mapper.ts'
import type { AlgoliaLocationHit } from '@/features/search/algolia/algolia.types.ts'
import type { PublicLocationCard } from '@/types/location.ts'

type UseAlgoliaLocationSearchOptions = {
  initialPage?: number
  initialQuery?: string
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
  totalPages: number
}

type AlgoliaLocationSearchSnapshot = {
  hits: PublicLocationCard[]
  searchTimeMs: number | null
  totalPages: number
}

const algoliaSearchCache = new Map<string, AlgoliaLocationSearchSnapshot>()
const algoliaSearchInFlight = new Map<string, Promise<AlgoliaLocationSearchSnapshot>>()

function buildSearchRequestKey(params: {
  hitsPerPage: number
  page: number
  query: string
}) {
  return JSON.stringify(params)
}

async function searchAlgoliaLocations(params: {
  hitsPerPage: number
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
          page: Math.max(0, params.page - 1),
          hitsPerPage: params.hitsPerPage,
          attributesToRetrieve: [
            'objectID',
            'location_code',
            'slug',
            'category_name',
            'category_slug',
            'department_name',
            'features',
            'cover_url',
            'cover_alt_text',
            'premium',
            'featured',
            'visibility_level',
            'address_public',
            'created_at',
            'updated_at',
          ],
        },
      ],
    })
    const firstResult = response.results[0]

    const snapshot: AlgoliaLocationSearchSnapshot = !firstResult
      ? {
          hits: [],
          searchTimeMs: null,
          totalPages: 0,
        }
      : {
          hits: firstResult.hits.map((hit: AlgoliaLocationHit) =>
            mapAlgoliaHitToPublicLocationCard(hit),
          ),
          searchTimeMs: firstResult.processingTimeMS ?? null,
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
    initialPage = 1,
    initialQuery = '',
    debounceMs = 350,
    hitsPerPage = 24,
  } = options

  const [query, setQueryState] = useState(initialQuery)
  const [page, setPageState] = useState(Math.max(1, initialPage))
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [hits, setHits] = useState<PublicLocationCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(0)
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null)
  const latestRequestKeyRef = useRef<string | null>(null)

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
    let isCancelled = false

    async function runSearch() {
      const requestKey = buildSearchRequestKey({
        hitsPerPage,
        page,
        query: debouncedQuery,
      })

      latestRequestKeyRef.current = requestKey

      try {
        setLoading(true)
        setError(null)

        const snapshot = await searchAlgoliaLocations({
          hitsPerPage,
          page,
          query: debouncedQuery,
        })

        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits(snapshot.hits)
        setTotalPages(snapshot.totalPages)
        setSearchTimeMs(snapshot.searchTimeMs)
      } catch (searchError) {
        if (isCancelled || latestRequestKeyRef.current !== requestKey) {
          return
        }

        setHits([])
        setSearchTimeMs(null)
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
  }, [debouncedQuery, hitsPerPage, page])

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
    totalPages,
  }
}

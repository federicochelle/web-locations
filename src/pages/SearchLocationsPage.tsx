import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { LocationsGrid } from '@/features/locations/components/LocationsGrid.tsx'
import { useAlgoliaLocationSearch } from '@/features/search/algolia/useAlgoliaLocationSearch.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

const SEARCH_RESULTS_PAGE_SIZE = 20

function parsePageParam(value: string | null) {
  const parsedValue = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1
}

type SearchResultsPaginationProps = {
  currentPage: number
  totalPages: number
  onNextPage: () => void
  onPreviousPage: () => void
}

function SearchResultsPagination({
  currentPage,
  totalPages,
  onNextPage,
  onPreviousPage,
}: SearchResultsPaginationProps) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#14110f] p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-100/68">
          Página {currentPage}
          {totalPages > 0 ? ` de ${totalPages}` : ''}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage <= 1}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={totalPages > 0 ? currentPage >= totalPages : false}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-300 px-4 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  )
}

export function SearchLocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryQuery = searchParams.get('category')
  const departmentQuery = searchParams.get('department')
  const searchQuery = searchParams.get('q')
  const featuresQuery = searchParams.get('features')
  const initialPage = parsePageParam(searchParams.get('page'))
  const currentSearchParams = searchParams.toString()

  const [legacyLocations, setLegacyLocations] = useState<PublicLocationCard[]>([])
  const [isLegacyLoading, setIsLegacyLoading] = useState(false)
  const [legacyError, setLegacyError] = useState<string | null>(null)
  const [legacyPage, setLegacyPage] = useState(initialPage)
  const [legacyTotalCount, setLegacyTotalCount] = useState(0)
  const [legacyTotalPages, setLegacyTotalPages] = useState(0)

  const normalizedCategorySlug = categoryQuery?.trim() ?? ''
  const normalizedDepartmentSlug = departmentQuery?.trim() ?? ''
  const trimmedSearchQuery = searchQuery?.trim() ?? ''
  const normalizedFeatureSlugs = useMemo(
    () =>
      (featuresQuery ?? '')
        .split(',')
        .map((featureSlug) => featureSlug.trim())
        .filter((featureSlug) => featureSlug.length > 0),
    [featuresQuery],
  )

  const hasAlgoliaSearch = trimmedSearchQuery.length > 0
  const hasLegacyCategory = normalizedCategorySlug.length > 0
  const hasLegacyDepartment = normalizedDepartmentSlug.length > 0
  const hasLegacyFeatures = normalizedFeatureSlugs.length > 0
  const hasLegacySearch =
    !hasAlgoliaSearch && (hasLegacyCategory || hasLegacyDepartment || hasLegacyFeatures)
  const hasValidSearch = hasAlgoliaSearch || hasLegacySearch

  const {
    error: algoliaError,
    hits: algoliaHits,
    loading: isAlgoliaLoading,
    nextPage,
    page,
    previousPage,
    query,
    totalHits: algoliaTotalHits,
    totalPages,
  } = useAlgoliaLocationSearch({
    departmentSlug: normalizedDepartmentSlug,
    enabled: hasAlgoliaSearch,
    initialPage,
    initialQuery: trimmedSearchQuery,
  })

  const locations = hasAlgoliaSearch ? algoliaHits : legacyLocations
  const sortedLocations = useMemo(
    () =>
      [...locations].sort((left, right) => {
        const leftCode = left.locationCode?.trim() || '\uffff'
        const rightCode = right.locationCode?.trim() || '\uffff'

        return leftCode.localeCompare(rightCode, 'es', {
          numeric: true,
          sensitivity: 'base',
        })
      }),
    [locations],
  )
  const isLoading = hasAlgoliaSearch ? isAlgoliaLoading : isLegacyLoading
  const error = hasAlgoliaSearch ? algoliaError : legacyError
  const currentPage = hasAlgoliaSearch ? page : legacyPage
  const currentTotalCount = hasAlgoliaSearch ? algoliaTotalHits : legacyTotalCount
  const currentTotalPages = hasAlgoliaSearch ? totalPages : legacyTotalPages

  function buildSearchParams(nextPage: number, nextQuery: string) {
    const nextSearchParams = new URLSearchParams()
    const trimmedNextQuery = nextQuery.trim()

    if (trimmedNextQuery) {
      nextSearchParams.set('q', trimmedNextQuery)
    }

    if (normalizedDepartmentSlug) {
      nextSearchParams.set('department', normalizedDepartmentSlug)
    }

    if (normalizedCategorySlug) {
      nextSearchParams.set('category', normalizedCategorySlug)
    }

    if (normalizedFeatureSlugs.length > 0) {
      nextSearchParams.set('features', normalizedFeatureSlugs.join(','))
    }

    if (nextPage > 1) {
      nextSearchParams.set('page', String(nextPage))
    }

    return nextSearchParams
  }

  usePageTitle('Resultados de busqueda')

  useEffect(() => {
    const nextSearchParams = buildSearchParams(currentPage, hasAlgoliaSearch ? query : trimmedSearchQuery)
    const nextSearchParamsString = nextSearchParams.toString()

    if (currentSearchParams !== nextSearchParamsString) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [
    currentPage,
    currentSearchParams,
    hasAlgoliaSearch,
    normalizedCategorySlug,
    normalizedDepartmentSlug,
    normalizedFeatureSlugs,
    query,
    setSearchParams,
    trimmedSearchQuery,
  ])

  useEffect(() => {
    if (hasAlgoliaSearch) {
      return
    }

    setLegacyPage(initialPage)
  }, [hasAlgoliaSearch, initialPage])

  useEffect(() => {
    if (!hasLegacySearch) {
      setLegacyLocations([])
      setLegacyError(null)
      setIsLegacyLoading(false)
      setLegacyPage(initialPage)
      setLegacyTotalCount(0)
      setLegacyTotalPages(0)
      return
    }

    let isMounted = true

    async function loadLegacyLocations() {
      try {
        setIsLegacyLoading(true)
        setLegacyError(null)

        // Legacy compatibility path for old URLs without a free-text query.
        const result = await getLocations({
          categorySlug: normalizedCategorySlug || null,
          departmentSlug: normalizedDepartmentSlug || null,
          page: initialPage,
          pageSize: SEARCH_RESULTS_PAGE_SIZE,
          search: '',
          featureSlugs: normalizedFeatureSlugs,
        })

        if (!isMounted) {
          return
        }

        setLegacyLocations(result.locations)
        setLegacyPage(result.page)
        setLegacyTotalCount(result.totalCount)
        setLegacyTotalPages(result.totalPages)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setLegacyLocations([])
        setLegacyPage(initialPage)
        setLegacyTotalCount(0)
        setLegacyTotalPages(0)
        setLegacyError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los resultados de la busqueda.',
        )
      } finally {
        if (isMounted) {
          setIsLegacyLoading(false)
        }
      }
    }

    void loadLegacyLocations()

    return () => {
      isMounted = false
    }
  }, [
    hasLegacySearch,
    initialPage,
    normalizedCategorySlug,
    normalizedDepartmentSlug,
    normalizedFeatureSlugs,
  ])

  useEffect(() => {
    if (currentPage <= 1) {
      return
    }

    if (currentTotalPages === 0) {
      const nextSearchParams = buildSearchParams(1, hasAlgoliaSearch ? query : trimmedSearchQuery)
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }

      return
    }

    if (currentPage > currentTotalPages) {
      const nextSearchParams = buildSearchParams(
        currentTotalPages,
        hasAlgoliaSearch ? query : trimmedSearchQuery,
      )
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }
    }
  }, [
    currentPage,
    currentSearchParams,
    currentTotalPages,
    hasAlgoliaSearch,
    query,
    setSearchParams,
    trimmedSearchQuery,
  ])

  function goToPreviousPage() {
    if (hasAlgoliaSearch) {
      previousPage()
      return
    }

    const nextSearchParams = buildSearchParams(Math.max(1, initialPage - 1), trimmedSearchQuery)
    setSearchParams(nextSearchParams)
  }

  function goToNextPage() {
    if (hasAlgoliaSearch) {
      nextPage()
      return
    }

    const boundedNextPage =
      currentTotalPages > 0 ? Math.min(currentTotalPages, initialPage + 1) : initialPage + 1
    const nextSearchParams = buildSearchParams(boundedNextPage, trimmedSearchQuery)
    setSearchParams(nextSearchParams)
  }

  if (!hasValidSearch) {
    return <Navigate replace to="/" />
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black">
      <div className="mx-auto max-w-[1720px] space-y-8 px-4 pb-16 pt-8 sm:space-y-10 sm:px-6 sm:pb-20 sm:pt-10 lg:space-y-12 lg:px-10 lg:pb-24 lg:pt-12 2xl:px-14">
        <section className="max-w-4xl space-y-3">
          <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
            Resultados de búsqueda
          </h1>
          {hasAlgoliaSearch ? (
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              Busqueda: "{trimmedSearchQuery}"
            </p>
          ) : null}
          {!isLoading && !error ? (
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              {currentTotalCount} resultados
            </p>
          ) : null}
        </section>

        {isLoading ? (
          <section className="w-full">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-[16/13] animate-pulse rounded-[0.9rem] bg-sand-200/80 lg:aspect-[16/12]"
                />
              ))}
            </div>
          </section>
        ) : null}

        {!isLoading && error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
            <h2 className="text-lg font-semibold">No se pudieron cargar los resultados</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        ) : null}

        {!isLoading && !error && locations.length === 0 ? (
          <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-brand-950">No encontramos resultados</h2>
            <p className="mt-2 text-sm text-sand-700">
              No encontramos locaciones publicadas para esta busqueda.
            </p>
          </section>
        ) : null}

        {!isLoading && !error && locations.length > 0 ? (
          <>
            <LocationsGrid locations={sortedLocations} />

            {currentTotalPages > 1 ? (
              <SearchResultsPagination
                currentPage={currentPage}
                totalPages={currentTotalPages}
                onNextPage={goToNextPage}
                onPreviousPage={goToPreviousPage}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}

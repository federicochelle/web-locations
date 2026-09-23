import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SearchResultsPagination } from '@/components/navigation/SearchResultsPagination.tsx'
import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { LocationsGrid } from '@/features/locations/components/LocationsGrid.tsx'
import { usePageSeo } from '@/hooks/usePageSeo.ts'
import { reportOperationalError } from '@/sentry-observability.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

const SEARCH_RESULTS_PAGE_SIZE = 20
const CRITICAL_IMAGE_TIMEOUT_MS = 2000

function getCriticalImageCount(totalImages: number) {
  const maxCriticalImages =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 2
      : 4

  return Math.min(totalImages, maxCriticalImages)
}

function parsePageParam(value: string | null) {
  const parsedValue = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1
}

export function SearchLocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryQuery = searchParams.get('category')
  const departmentQuery = searchParams.get('department')
  const initialPage = parsePageParam(searchParams.get('page'))
  const currentSearchParams = searchParams.toString()
  const previousSearchSignatureRef = useRef<string | null>(null)

  const [locations, setLocations] = useState<PublicLocationCard[]>([])
  const [isDataLoading, setIsDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [resolvedCriticalImagesCount, setResolvedCriticalImagesCount] = useState(0)
  const [isWaitingForCriticalImages, setIsWaitingForCriticalImages] = useState(false)

  const normalizedCategorySlug = categoryQuery?.trim() ?? ''
  const normalizedDepartmentSlug = departmentQuery?.trim() ?? ''
  const currentSearchSignature = JSON.stringify({
    category: normalizedCategorySlug,
    department: normalizedDepartmentSlug,
  })

  useEffect(() => {
    if (!searchParams.has('q') && !searchParams.has('features')) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('q')
    nextSearchParams.delete('features')
    setSearchParams(nextSearchParams, { replace: true })
  }, [searchParams, setSearchParams])

  const sortedLocations = useMemo(
    () => [...locations].sort((left, right) => {
      const leftCode = left.locationCode?.trim() || '\uffff'
      const rightCode = right.locationCode?.trim() || '\uffff'

      return leftCode.localeCompare(rightCode, 'es', {
        numeric: true,
        sensitivity: 'base',
      })
    }),
    [locations],
  )
  const currentPage = initialPage
  const criticalImageCount = getCriticalImageCount(sortedLocations.length)
  const hasSettledCurrentSearch = !isDataLoading
  const shouldShowGlobalLoading = isDataLoading
  const shouldShowEmptyState =
    !shouldShowGlobalLoading &&
    !error &&
    hasSettledCurrentSearch &&
    sortedLocations.length === 0

  const buildSearchParams = useCallback((nextPage: number) => {
    const nextSearchParams = new URLSearchParams()

    if (normalizedDepartmentSlug) {
      nextSearchParams.set('department', normalizedDepartmentSlug)
    }

    if (normalizedCategorySlug) {
      nextSearchParams.set('category', normalizedCategorySlug)
    }

    if (nextPage > 1) {
      nextSearchParams.set('page', String(nextPage))
    }

    return nextSearchParams
  }, [normalizedCategorySlug, normalizedDepartmentSlug])

  usePageSeo({
    title: 'Búsqueda de locaciones',
    description: 'Explorá locaciones publicadas en Sitio Locaciones.',
    canonicalPath: '/busqueda',
  })

  useEffect(() => {
    const previousSearchSignature = previousSearchSignatureRef.current
    previousSearchSignatureRef.current = currentSearchSignature

    if (previousSearchSignature === null || previousSearchSignature === currentSearchSignature) {
      return
    }

    if (initialPage === 1) {
      return
    }

    const nextSearchParams = buildSearchParams(1)
    const nextSearchParamsString = nextSearchParams.toString()

    if (currentSearchParams !== nextSearchParamsString) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [
    buildSearchParams,
    currentSearchParams,
    currentSearchSignature,
    initialPage,
    setSearchParams,
  ])

  useEffect(() => {
    let isMounted = true

    async function loadLocations() {
      try {
        setIsDataLoading(true)
        setError(null)
        setResolvedCriticalImagesCount(0)
        setIsWaitingForCriticalImages(false)

        const result = await getLocations({
          categorySlug: normalizedCategorySlug || null,
          departmentSlug: normalizedDepartmentSlug || null,
          page: initialPage,
          pageSize: SEARCH_RESULTS_PAGE_SIZE,
          search: null,
        })

        if (!isMounted) {
          return
        }

        setLocations(result.locations)
        setTotalCount(result.totalCount)
        setTotalPages(result.totalPages)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        reportOperationalError(loadError, {
          action: 'search.legacy.load',
          rpc: 'search_public_locations_v2',
          extra: {
            categorySlug: normalizedCategorySlug,
            departmentSlug: normalizedDepartmentSlug,
            hasSearch: false,
            page: initialPage,
          },
        })
        setLocations([])
        setTotalCount(0)
        setTotalPages(0)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los resultados de la búsqueda.',
        )
      } finally {
        if (isMounted) {
          setIsDataLoading(false)
        }
      }
    }

    void loadLocations()

    return () => {
      isMounted = false
    }
  }, [
    initialPage,
    normalizedCategorySlug,
    normalizedDepartmentSlug,
  ])

  useEffect(() => {
    if (isDataLoading || error || sortedLocations.length === 0 || criticalImageCount === 0) {
      setIsWaitingForCriticalImages(false)
      return
    }

    if (resolvedCriticalImagesCount >= criticalImageCount) {
      setIsWaitingForCriticalImages(false)
      return
    }

    setIsWaitingForCriticalImages(true)

    const timeoutId = window.setTimeout(() => {
      setIsWaitingForCriticalImages(false)
    }, CRITICAL_IMAGE_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [criticalImageCount, error, isDataLoading, sortedLocations.length, resolvedCriticalImagesCount])

  useEffect(() => {
    if (isDataLoading) {
      return
    }

    if (currentPage <= 1) {
      return
    }

    if (totalPages === 0) {
      const nextSearchParams = buildSearchParams(1)
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }

      return
    }

    if (currentPage > totalPages) {
      const nextSearchParams = buildSearchParams(totalPages)
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }
    }
  }, [
    currentPage,
    currentSearchParams,
    buildSearchParams,
    totalPages,
    isDataLoading,
    setSearchParams,
  ])

  function goToPreviousPage() {
    const nextSearchParams = buildSearchParams(Math.max(1, currentPage - 1))
    setSearchParams(nextSearchParams)
  }

  function goToNextPage() {
    const boundedNextPage =
      totalPages > 0 ? Math.min(totalPages, currentPage + 1) : currentPage + 1
    const nextSearchParams = buildSearchParams(boundedNextPage)
    setSearchParams(nextSearchParams)
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      <div className="mx-auto max-w-[1720px] space-y-8 px-4 pb-16 pt-8 sm:space-y-10 sm:px-6 sm:pb-20 sm:pt-10 lg:space-y-12 lg:px-10 lg:pb-24 lg:pt-12 2xl:px-14">
        <section className="max-w-4xl space-y-3">
          <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
            Resultados de búsqueda
          </h1>
          {!shouldShowGlobalLoading && !error && !shouldShowEmptyState ? (
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              {sortedLocations.length > 0
                ? `${totalCount} ${totalCount === 1 ? 'resultado' : 'resultados'}`
                : ''}
            </p>
          ) : null}
        </section>

        {shouldShowGlobalLoading ? (
          <section className="w-full">
            <AppLoading label="Cargando resultados..." />
          </section>
        ) : null}

        {!shouldShowGlobalLoading && error ? (
          <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
            <h2 className="text-lg font-semibold">No se pudieron cargar los resultados</h2>
            <p className="mt-2 text-sm">{error}</p>
          </section>
        ) : null}

        {shouldShowEmptyState ? (
          <section className="space-y-6 sm:space-y-8">
            <div className="max-w-5xl">
              <h2 className="text-sm font-medium leading-6 tracking-[-0.01em] text-brand-100/68 sm:text-[0.95rem] lg:text-[1rem]">
                No encontramos resultados.
              </h2>
            </div>
          </section>
        ) : null}

        {!shouldShowGlobalLoading && !error && hasSettledCurrentSearch && sortedLocations.length > 0 ? (
          <div
            className={
              isWaitingForCriticalImages
                ? 'pointer-events-none invisible max-h-0 overflow-hidden'
                : ''
            }
            aria-hidden={isWaitingForCriticalImages}
          >
            <LocationsGrid
              locations={sortedLocations}
              onCriticalImageSettled={() => {
                setResolvedCriticalImagesCount((currentCount) => currentCount + 1)
              }}
            />
          </div>
        ) : null}

        {!shouldShowGlobalLoading && !error && hasSettledCurrentSearch && sortedLocations.length > 0 ? (
          <>
            {totalPages > 1 ? (
              <SearchResultsPagination
                currentPage={currentPage}
                totalPages={totalPages}
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

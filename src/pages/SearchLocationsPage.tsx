import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { SearchResultsPagination } from '@/components/navigation/SearchResultsPagination.tsx'
import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { LocationsGrid } from '@/features/locations/components/LocationsGrid.tsx'
import {
  searchAlgoliaLocationCards,
  useAlgoliaLocationSearch,
} from '@/features/search/algolia/useAlgoliaLocationSearch.ts'
import { useLocationSearchInterpretation } from '@/features/search/interpretation/useLocationSearchInterpretation.ts'
import {
  searchSupabaseLocationCardsV3,
  useSupabaseLocationSearchV3,
} from '@/features/search/supabase/useSupabaseLocationSearchV3.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getCategories } from '@/services/categories.service.ts'
import { getPublicDepartmentNameBySlug } from '@/services/departments.service.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { Category, PublicLocationCard } from '@/types/location.ts'

const SEARCH_RESULTS_PAGE_SIZE = 20
const CRITICAL_IMAGE_TIMEOUT_MS = 2000
const USE_SUPABASE_SEARCH_V3 = import.meta.env.VITE_USE_SUPABASE_SEARCH_V3 === 'true'
const GENERIC_INTENT_TERMS = new Set([
  'algo',
  'ambiente',
  'antiguo',
  'espacio',
  'grande',
  'lindo',
  'locacion',
  'lugar',
  'sitio',
])

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-UY')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

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

function dedupeLocations(locations: PublicLocationCard[]) {
  return [...new Map(locations.map((location) => [location.id, location])).values()]
}

function prioritizeLocationsByDepartment(
  locations: PublicLocationCard[],
  departmentName: string,
) {
  if (!departmentName) {
    return locations
  }

  const normalizedDepartmentName = departmentName.trim().toLocaleLowerCase('es-UY')

  if (!normalizedDepartmentName) {
    return locations
  }

  const matchingDepartmentLocations: PublicLocationCard[] = []
  const remainingLocations: PublicLocationCard[] = []

  for (const location of locations) {
    if (location.departmentName.trim().toLocaleLowerCase('es-UY') === normalizedDepartmentName) {
      matchingDepartmentLocations.push(location)
      continue
    }

    remainingLocations.push(location)
  }

  return [...matchingDepartmentLocations, ...remainingLocations]
}

function buildCategoryIntentCandidates(categories: Category[]) {
  return categories
    .flatMap((category) => {
      const candidates = [category.name, category.slug.replace(/-/g, ' ')]
        .map((candidate) => candidate.trim())
        .filter((candidate, index, values) => candidate.length > 0 && values.indexOf(candidate) === index)

      return candidates.map((candidate) => ({
        categoryName: category.name.trim(),
        normalizedCandidate: normalizeSearchText(candidate),
      }))
    })
    .sort(
      (left, right) =>
        right.normalizedCandidate.split(' ').length - left.normalizedCandidate.split(' ').length,
    )
}

function detectPrimaryIntent(
  coreQuery: string,
  categories: Category[],
) {
  const normalizedCoreQuery = normalizeSearchText(coreQuery)

  if (!normalizedCoreQuery) {
    return null
  }

  const paddedCoreQuery = ` ${normalizedCoreQuery} `
  const categoryCandidates = buildCategoryIntentCandidates(categories)

  for (const candidate of categoryCandidates) {
    if (
      candidate.normalizedCandidate &&
      paddedCoreQuery.includes(` ${candidate.normalizedCandidate} `)
    ) {
      return candidate.categoryName
    }
  }

  const terms = normalizedCoreQuery.split(' ').filter((term) => term.length > 0)

  if (terms.length <= 1) {
    return null
  }

  const [firstTerm] = terms

  if (!firstTerm || firstTerm.length < 4 || GENERIC_INTENT_TERMS.has(firstTerm)) {
    return null
  }

  return firstTerm
}

export function SearchLocationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryQuery = searchParams.get('category')
  const departmentQuery = searchParams.get('department')
  const searchQuery = searchParams.get('q')
  const featuresQuery = searchParams.get('features')
  const initialPage = parsePageParam(searchParams.get('page'))
  const currentSearchParams = searchParams.toString()
  const previousSearchSignatureRef = useRef<string | null>(null)

  const [legacyLocations, setLegacyLocations] = useState<PublicLocationCard[]>([])
  const [isLegacyLoading, setIsLegacyLoading] = useState(false)
  const [legacyError, setLegacyError] = useState<string | null>(null)
  const [legacyTotalCount, setLegacyTotalCount] = useState(0)
  const [legacyTotalPages, setLegacyTotalPages] = useState(0)
  const [resolvedCriticalImagesCount, setResolvedCriticalImagesCount] = useState(0)
  const [isWaitingForCriticalImages, setIsWaitingForCriticalImages] = useState(false)
  const [resolvedDepartmentName, setResolvedDepartmentName] = useState<string | null>(null)
  const [isDepartmentResolutionLoading, setIsDepartmentResolutionLoading] = useState(false)
  const [departmentResolutionError, setDepartmentResolutionError] = useState<string | null>(null)
  const [suggestedLocations, setSuggestedLocations] = useState<PublicLocationCard[]>([])

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
  const hasSearchQuery = trimmedSearchQuery.length > 0
  const shouldUseSupabaseSearchV3 = hasSearchQuery && USE_SUPABASE_SEARCH_V3
  const hasAlgoliaSearch = hasSearchQuery && !shouldUseSupabaseSearchV3
  const shouldUseLegacyResults = !hasSearchQuery
  const currentSearchSignature = JSON.stringify({
    backend: shouldUseSupabaseSearchV3 ? 'supabase-v3' : hasAlgoliaSearch ? 'algolia' : 'legacy',
    category: normalizedCategorySlug,
    department: normalizedDepartmentSlug,
    features: normalizedFeatureSlugs,
    q: trimmedSearchQuery,
  })
  const {
    coreQuery,
    optionalTerms,
    loading: isSearchInterpretationLoading,
    fallback: didSearchInterpretationFallback,
    fallbackReason: searchInterpretationFallbackReason,
    rawQuery,
    shouldUseAi,
    usedAi,
    durationMs: searchInterpretationDurationMs,
  } = useLocationSearchInterpretation({
    enabled: hasSearchQuery,
    query: trimmedSearchQuery,
  })
  const effectiveSearchQuery = coreQuery.trim() || trimmedSearchQuery
  const isAwaitingDepartmentResolution =
    hasSearchQuery &&
    normalizedDepartmentSlug.length > 0 &&
    isDepartmentResolutionLoading
  const isAwaitingSearchInterpretation = hasSearchQuery && shouldUseAi && isSearchInterpretationLoading
  const legacySearchQuery = hasSearchQuery ? effectiveSearchQuery : ''
  const isAwaitingLegacySearchInterpretation =
    shouldUseLegacyResults && hasSearchQuery && shouldUseAi && isSearchInterpretationLoading

  useEffect(() => {
    if (!hasSearchQuery || normalizedDepartmentSlug.length === 0) {
      setResolvedDepartmentName(null)
      setIsDepartmentResolutionLoading(false)
      setDepartmentResolutionError(null)
      return
    }

    let isCancelled = false

    async function resolveDepartmentName() {
      try {
        setIsDepartmentResolutionLoading(true)
        setDepartmentResolutionError(null)
        const nextDepartmentName = await getPublicDepartmentNameBySlug(normalizedDepartmentSlug)

        if (isCancelled) {
          return
        }

        setResolvedDepartmentName(nextDepartmentName)

        if (!nextDepartmentName) {
          setDepartmentResolutionError('No pudimos resolver el departamento seleccionado.')
        }
      } catch (resolveError) {
        if (isCancelled) {
          return
        }

        setResolvedDepartmentName(null)
        setDepartmentResolutionError(
          resolveError instanceof Error
            ? resolveError.message
            : 'No pudimos resolver el departamento seleccionado.',
        )
      } finally {
        if (!isCancelled) {
          setIsDepartmentResolutionLoading(false)
        }
      }
    }

    void resolveDepartmentName()

    return () => {
      isCancelled = true
    }
  }, [hasSearchQuery, normalizedDepartmentSlug])

  const {
    currentRequestKey: currentAlgoliaRequestKey,
    error: algoliaError,
    hits: algoliaHits,
    loading: isAlgoliaLoading,
    page,
    settledRequestKey: settledAlgoliaRequestKey,
    totalHits: algoliaTotalHits,
    totalPages,
  } = useAlgoliaLocationSearch({
    departmentName: resolvedDepartmentName ?? '',
    enabled: hasAlgoliaSearch && !isAwaitingDepartmentResolution && !isAwaitingSearchInterpretation,
    initialPage,
    initialQuery: effectiveSearchQuery,
    optionalTerms,
  })
  const {
    currentRequestKey: currentSupabaseRequestKey,
    error: supabaseSearchError,
    hits: supabaseHits,
    loading: isSupabaseSearchLoading,
    settledRequestKey: settledSupabaseRequestKey,
    totalHits: supabaseTotalHits,
  } = useSupabaseLocationSearchV3({
    coreQuery: effectiveSearchQuery,
    departmentSlug: normalizedDepartmentSlug,
    enabled:
      shouldUseSupabaseSearchV3 &&
      !isAwaitingDepartmentResolution &&
      !isAwaitingSearchInterpretation,
    limit: 100,
    optionalTerms,
  })

  const locations = useMemo(() => {
    if (shouldUseSupabaseSearchV3) {
      return supabaseHits
    }

    if (hasAlgoliaSearch) {
      return algoliaHits
    }

    return [...legacyLocations].sort((left, right) => {
      const leftCode = left.locationCode?.trim() || '\uffff'
      const rightCode = right.locationCode?.trim() || '\uffff'

      return leftCode.localeCompare(rightCode, 'es', {
        numeric: true,
        sensitivity: 'base',
      })
    })
  }, [algoliaHits, hasAlgoliaSearch, legacyLocations, shouldUseSupabaseSearchV3, supabaseHits])
  const isLoading = hasSearchQuery
    ? isAwaitingDepartmentResolution ||
      isSearchInterpretationLoading ||
      (shouldUseSupabaseSearchV3 ? isSupabaseSearchLoading : isAlgoliaLoading)
    : isAwaitingLegacySearchInterpretation || isLegacyLoading
  const error = hasSearchQuery
    ? departmentResolutionError ?? (shouldUseSupabaseSearchV3 ? supabaseSearchError : algoliaError)
    : legacyError
  const currentPage = shouldUseSupabaseSearchV3 ? 1 : hasAlgoliaSearch ? page : initialPage
  const currentTotalCount = hasSearchQuery
    ? shouldUseSupabaseSearchV3
      ? supabaseTotalHits
      : algoliaTotalHits
    : legacyTotalCount
  const currentTotalPages = shouldUseSupabaseSearchV3 ? 0 : hasAlgoliaSearch ? totalPages : legacyTotalPages
  const criticalImageCount = getCriticalImageCount(locations.length)
  const currentSearchRequestKey = shouldUseSupabaseSearchV3
    ? currentSupabaseRequestKey
    : hasAlgoliaSearch
      ? currentAlgoliaRequestKey
      : null
  const settledSearchRequestKey = shouldUseSupabaseSearchV3
    ? settledSupabaseRequestKey
    : hasAlgoliaSearch
      ? settledAlgoliaRequestKey
      : null
  const hasSettledCurrentSearch = hasSearchQuery
    ? Boolean(currentSearchRequestKey) &&
      currentSearchRequestKey === settledSearchRequestKey
    : !isLoading
  const isPendingCurrentSearch = hasSearchQuery && !hasSettledCurrentSearch
  const shouldShowGlobalLoading = isLoading || isPendingCurrentSearch
  const shouldShowEmptyState =
    !shouldShowGlobalLoading &&
    !error &&
    hasSettledCurrentSearch &&
    locations.length === 0

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

    if (nextPage > 1 && !(hasSearchQuery && shouldUseSupabaseSearchV3)) {
      nextSearchParams.set('page', String(nextPage))
    }

    return nextSearchParams
  }

  usePageTitle('Resultados de búsqueda')

  useEffect(() => {
    if (!import.meta.env.DEV || !hasSearchQuery) {
      return
    }

    console.info('[search-query-analysis]', {
      rawQuery,
      coreQuery: effectiveSearchQuery,
      optionalTerms,
      usedAi,
      fallback: didSearchInterpretationFallback,
      fallbackReason: searchInterpretationFallbackReason,
      durationMs: searchInterpretationDurationMs,
    })
  }, [
    didSearchInterpretationFallback,
    effectiveSearchQuery,
    hasSearchQuery,
    optionalTerms,
    rawQuery,
    searchInterpretationFallbackReason,
    searchInterpretationDurationMs,
    usedAi,
  ])

  useEffect(() => {
    const previousSearchSignature = previousSearchSignatureRef.current
    previousSearchSignatureRef.current = currentSearchSignature

    if (previousSearchSignature === null || previousSearchSignature === currentSearchSignature) {
      return
    }

    if (initialPage === 1) {
      return
    }

    const nextSearchParams = buildSearchParams(1, trimmedSearchQuery)
    const nextSearchParamsString = nextSearchParams.toString()

    if (currentSearchParams !== nextSearchParamsString) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [currentSearchParams, currentSearchSignature, initialPage, setSearchParams, trimmedSearchQuery])

  useEffect(() => {
    if (!shouldUseLegacyResults) {
      return
    }

    let isMounted = true

    async function loadLegacyLocations() {
      if (isAwaitingLegacySearchInterpretation) {
        return
      }

      try {
        setIsLegacyLoading(true)
        setLegacyError(null)
        setResolvedCriticalImagesCount(0)
        setIsWaitingForCriticalImages(false)

        // Legacy compatibility path for old URLs without a free-text query.
        const result = await getLocations({
          categorySlug: normalizedCategorySlug || null,
          departmentSlug: normalizedDepartmentSlug || null,
          page: initialPage,
          pageSize: SEARCH_RESULTS_PAGE_SIZE,
          search: legacySearchQuery,
          featureSlugs: normalizedFeatureSlugs,
        })

        if (!isMounted) {
          return
        }

        setLegacyLocations(result.locations)
        setLegacyTotalCount(result.totalCount)
        setLegacyTotalPages(result.totalPages)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setLegacyLocations([])
        setLegacyTotalCount(0)
        setLegacyTotalPages(0)
        setLegacyError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los resultados de la búsqueda.',
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
    shouldUseLegacyResults,
    isAwaitingLegacySearchInterpretation,
    initialPage,
    legacySearchQuery,
    normalizedCategorySlug,
    normalizedDepartmentSlug,
    normalizedFeatureSlugs,
  ])

  useEffect(() => {
    if (!hasSearchQuery) {
      return
    }

    setResolvedCriticalImagesCount(0)
    setIsWaitingForCriticalImages(false)
  }, [currentSearchRequestKey, hasSearchQuery])

  useEffect(() => {
    if (!shouldShowEmptyState) {
      setSuggestedLocations([])
      return
    }

    let isCancelled = false

    async function loadSuggestedLocations() {
      try {
        let nextSuggestedLocations: PublicLocationCard[] = []

        if (shouldUseSupabaseSearchV3) {
          const primarySuggestions = await searchSupabaseLocationCardsV3({
            coreQuery: effectiveSearchQuery,
            limit: 12,
            optionalTerms,
          })

          if (isCancelled) {
            return
          }

          nextSuggestedLocations = dedupeLocations(
            prioritizeLocationsByDepartment(
              primarySuggestions,
              resolvedDepartmentName ?? '',
            ),
          )

          if (nextSuggestedLocations.length === 0) {
            const categories = await getCategories()
            const primaryIntent = detectPrimaryIntent(effectiveSearchQuery, categories)

            if (isCancelled) {
              return
            }

            if (
              primaryIntent &&
              normalizeSearchText(primaryIntent) !== normalizeSearchText(effectiveSearchQuery)
            ) {
              const intentSuggestions = await searchSupabaseLocationCardsV3({
                coreQuery: primaryIntent,
                limit: 12,
              })

              if (isCancelled) {
                return
              }

              nextSuggestedLocations = dedupeLocations(
                prioritizeLocationsByDepartment(
                  intentSuggestions,
                  resolvedDepartmentName ?? '',
                ),
              )
            }
          }
        } else {
          const primarySuggestions = await searchAlgoliaLocationCards({
            hitsPerPage: 12,
            optionalTerms,
            query: effectiveSearchQuery,
          })

          if (isCancelled) {
            return
          }

          nextSuggestedLocations = dedupeLocations(
            prioritizeLocationsByDepartment(
              primarySuggestions,
              resolvedDepartmentName ?? '',
            ),
          )

          if (nextSuggestedLocations.length < 4) {
            const categories = await getCategories()
            const primaryIntent = detectPrimaryIntent(effectiveSearchQuery, categories)

            if (isCancelled) {
              return
            }

            if (
              primaryIntent &&
              normalizeSearchText(primaryIntent) !== normalizeSearchText(effectiveSearchQuery)
            ) {
              const intentSuggestions = await searchAlgoliaLocationCards({
                hitsPerPage: 12,
                query: primaryIntent,
              })

              if (isCancelled) {
                return
              }

              nextSuggestedLocations = dedupeLocations([
                ...nextSuggestedLocations,
                ...prioritizeLocationsByDepartment(
                  intentSuggestions,
                  resolvedDepartmentName ?? '',
                ),
              ])
            }
          }
        }

        if (nextSuggestedLocations.length === 0) {
          const fallbackLocationsResult = await getLocations({
            page: 1,
            pageSize: 12,
          })

          if (isCancelled) {
            return
          }

          nextSuggestedLocations = dedupeLocations([
            ...nextSuggestedLocations,
            ...prioritizeLocationsByDepartment(
              fallbackLocationsResult.locations,
              resolvedDepartmentName ?? '',
            ),
          ])
        }

        setSuggestedLocations(nextSuggestedLocations.slice(0, 4))
      } catch {
        if (isCancelled) {
          return
        }

        setSuggestedLocations([])
      }
    }

    void loadSuggestedLocations()

    return () => {
      isCancelled = true
    }
  }, [
    effectiveSearchQuery,
    optionalTerms,
    resolvedDepartmentName,
    shouldShowEmptyState,
    shouldUseSupabaseSearchV3,
  ])

  useEffect(() => {
    if (isLoading || error || locations.length === 0 || criticalImageCount === 0) {
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
  }, [criticalImageCount, error, isLoading, locations.length, resolvedCriticalImagesCount])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (currentPage <= 1) {
      return
    }

    if (currentTotalPages === 0) {
      const nextSearchParams = buildSearchParams(1, trimmedSearchQuery)
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }

      return
    }

    if (currentPage > currentTotalPages) {
      const nextSearchParams = buildSearchParams(
        currentTotalPages,
        trimmedSearchQuery,
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
    isLoading,
    setSearchParams,
    trimmedSearchQuery,
  ])

  function goToPreviousPage() {
    const nextSearchParams = buildSearchParams(Math.max(1, currentPage - 1), trimmedSearchQuery)
    setSearchParams(nextSearchParams)
  }

  function goToNextPage() {
    const boundedNextPage =
      currentTotalPages > 0 ? Math.min(currentTotalPages, currentPage + 1) : currentPage + 1
    const nextSearchParams = buildSearchParams(boundedNextPage, trimmedSearchQuery)
    setSearchParams(nextSearchParams)
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      <div className="mx-auto max-w-[1720px] space-y-8 px-4 pb-16 pt-8 sm:space-y-10 sm:px-6 sm:pb-20 sm:pt-10 lg:space-y-12 lg:px-10 lg:pb-24 lg:pt-12 2xl:px-14">
        <section className="max-w-4xl space-y-3">
          <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
            Resultados de búsqueda
          </h1>
          {hasSearchQuery && !shouldShowEmptyState ? (
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              Busqueda: "{trimmedSearchQuery}"
            </p>
          ) : null}
          {!shouldShowGlobalLoading && !error && !shouldShowEmptyState ? (
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              {locations.length > 0
                ? `${currentTotalCount} ${currentTotalCount === 1 ? 'resultado' : 'resultados'}`
                : ''}
            </p>
          ) : null}
        </section>

        {shouldShowGlobalLoading ? (
          <section className="w-full">
            <AppLoading
              label={
                hasAlgoliaSearch && isSearchInterpretationLoading
                  ? 'Interpretando búsqueda...'
                  : 'Cargando resultados...'
              }
            />
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
                No encontramos resultados para "{rawQuery}"
                {suggestedLocations.length > 0
                  ? ' pero también te puede interesar:'
                  : ''}
                
              </h2>
            </div>

            {suggestedLocations.length > 0 ? (
              <LocationsGrid locations={suggestedLocations} />
            ) : null}
          </section>
        ) : null}

        {!shouldShowGlobalLoading && !error && hasSettledCurrentSearch && locations.length > 0 ? (
          <div
            className={
              isWaitingForCriticalImages
                ? 'pointer-events-none invisible max-h-0 overflow-hidden'
                : ''
            }
            aria-hidden={isWaitingForCriticalImages}
          >
            <LocationsGrid
              locations={locations}
              onCriticalImageSettled={() => {
                setResolvedCriticalImagesCount((currentCount) => currentCount + 1)
              }}
            />
          </div>
        ) : null}

        {!shouldShowGlobalLoading && !error && hasSettledCurrentSearch && locations.length > 0 ? (
          <>
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

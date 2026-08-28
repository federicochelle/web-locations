import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { SearchResultsPagination } from '@/components/navigation/SearchResultsPagination.tsx'
import { CategoryLocationsGrid } from '@/features/locations/components/CategoryLocationsGrid.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { RouteLoadingFallback } from '@/routes/RouteLoadingFallback.tsx'
import { getPublicDepartmentsByCategory } from '@/services/departments.service.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { Department, PublicLocationCard } from '@/types/location.ts'

const CATEGORY_RESULTS_PAGE_SIZE = 20
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

export function CategoryLocationsPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q')
  const departmentQuery = searchParams.get('department')
  const featuresQuery = searchParams.get('features')
  const initialPage = parsePageParam(searchParams.get('page'))
  const currentSearchParams = searchParams.toString()
  const filterPopoverRef = useRef<HTMLDivElement | null>(null)
  const previousSearchSignatureRef = useRef<string | null>(null)

  const [locations, setLocations] = useState<PublicLocationCard[]>([])
  const [availableDepartments, setAvailableDepartments] = useState<Department[]>([])
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null)
  const [categoryExists, setCategoryExists] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isDepartmentsLoading, setIsDepartmentsLoading] = useState(true)
  const [totalPages, setTotalPages] = useState(0)
  const [resolvedCriticalImagesCount, setResolvedCriticalImagesCount] = useState(0)
  const [isWaitingForCriticalImages, setIsWaitingForCriticalImages] = useState(false)
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedSearchQuery = searchQuery?.trim() ?? ''
  const normalizedDepartmentSlug = departmentQuery?.trim() ?? ''
  const normalizedFeatureSlugs = useMemo(
    () =>
      (featuresQuery ?? '')
        .split(',')
        .map((featureSlug) => featureSlug.trim())
        .filter((featureSlug) => featureSlug.length > 0),
    [featuresQuery],
  )
  const fallbackCategoryName = useMemo(() => {
    const normalizedSlug = slug?.trim() ?? ''

    if (!normalizedSlug) {
      return 'Locaciones'
    }

    return normalizedSlug
      .split('-')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ')
  }, [slug])
  const hasActiveSearch = trimmedSearchQuery.length > 0
  const headingTitle = activeCategoryName ?? fallbackCategoryName
  const categorySubtitleName = headingTitle.trim().toLocaleLowerCase('es-UY')
  const criticalImageCount = getCriticalImageCount(locations.length)
  const currentSearchSignature = JSON.stringify({
    department: normalizedDepartmentSlug,
    features: normalizedFeatureSlugs,
    q: trimmedSearchQuery,
  })

  const activeHeadingParts = [
    `Categoria: ${headingTitle}`,
    hasActiveSearch ? `Busqueda: "${trimmedSearchQuery}"` : null,
    normalizedDepartmentSlug ? `Departamento: ${normalizedDepartmentSlug}` : null,
  ].filter((part): part is string => Boolean(part))

  usePageTitle(activeHeadingParts.length > 0 ? activeHeadingParts.join(' · ') : 'Categoria')

  function buildSearchParams(nextPage: number, nextDepartmentSlug: string) {
    const nextSearchParams = new URLSearchParams()

    if (trimmedSearchQuery) {
      nextSearchParams.set('q', trimmedSearchQuery)
    }

    if (nextDepartmentSlug) {
      nextSearchParams.set('department', nextDepartmentSlug)
    }

    if (normalizedFeatureSlugs.length > 0) {
      nextSearchParams.set('features', normalizedFeatureSlugs.join(','))
    }

    if (nextPage > 1) {
      nextSearchParams.set('page', String(nextPage))
    }

    return nextSearchParams
  }

  useEffect(() => {
    if (!isFilterPopoverOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!filterPopoverRef.current) {
        return
      }

      const target = event.target

      if (target instanceof Node && !filterPopoverRef.current.contains(target)) {
        setIsFilterPopoverOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isFilterPopoverOpen])

  useEffect(() => {
    let isMounted = true

    async function loadDepartments() {
      if (!slug) {
        if (isMounted) {
          setAvailableDepartments([])
          setIsDepartmentsLoading(false)
        }
        return
      }

      try {
        setIsDepartmentsLoading(true)
        const nextDepartments = await getPublicDepartmentsByCategory(slug)

        if (!isMounted) {
          return
        }

        setAvailableDepartments(nextDepartments)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        console.error('[category-departments-error]', loadError)
        setAvailableDepartments([])
      } finally {
        if (isMounted) {
          setIsDepartmentsLoading(false)
        }
      }
    }

    void loadDepartments()

    return () => {
      isMounted = false
    }
  }, [slug])

  useEffect(() => {
    let isMounted = true

    async function loadLocations() {
      if (!slug) {
        if (isMounted) {
          setLocations([])
          setActiveCategoryName(null)
          setCategoryExists(false)
          setIsDataLoading(false)
        }
        return
      }

      try {
        setIsDataLoading(true)
        setError(null)
        setCategoryExists(true)
        setResolvedCriticalImagesCount(0)
        setIsWaitingForCriticalImages(false)

        const result = await getLocations({
          categorySlug: slug,
          departmentSlug: normalizedDepartmentSlug || null,
          page: initialPage,
          pageSize: CATEGORY_RESULTS_PAGE_SIZE,
          search: trimmedSearchQuery,
          featureSlugs: normalizedFeatureSlugs,
        })

        if (!isMounted) {
          return
        }

        const nextCriticalImageCount = getCriticalImageCount(result.locations.length)

        setLocations(result.locations)
        setActiveCategoryName(result.activeCategory?.name ?? null)
        setCategoryExists(result.categoryExists)
        setTotalPages(result.totalPages)
        setIsWaitingForCriticalImages(nextCriticalImageCount > 0)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setLocations([])
        setActiveCategoryName(null)
        setTotalPages(0)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las locaciones de la categoria.',
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
  }, [initialPage, normalizedDepartmentSlug, normalizedFeatureSlugs, slug, trimmedSearchQuery])

  useEffect(() => {
    const previousSearchSignature = previousSearchSignatureRef.current
    previousSearchSignatureRef.current = currentSearchSignature

    if (previousSearchSignature === null || previousSearchSignature === currentSearchSignature) {
      return
    }

    if (initialPage === 1) {
      return
    }

    const nextSearchParams = buildSearchParams(1, normalizedDepartmentSlug)
    const nextSearchParamsString = nextSearchParams.toString()

    if (currentSearchParams !== nextSearchParamsString) {
      setSearchParams(nextSearchParams, { replace: true })
    }
  }, [
    currentSearchParams,
    currentSearchSignature,
    initialPage,
    normalizedDepartmentSlug,
    setSearchParams,
  ])

  useEffect(() => {
    if (
      isDataLoading ||
      error ||
      !categoryExists ||
      locations.length === 0 ||
      criticalImageCount === 0
    ) {
      setIsWaitingForCriticalImages(false)
      return
    }

    if (resolvedCriticalImagesCount >= criticalImageCount) {
      setIsWaitingForCriticalImages(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsWaitingForCriticalImages(false)
    }, CRITICAL_IMAGE_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    categoryExists,
    criticalImageCount,
    error,
    isDataLoading,
    locations.length,
    resolvedCriticalImagesCount,
  ])

  const isLoading = isDataLoading || isWaitingForCriticalImages

  function updateDepartmentFilter(nextDepartmentSlug: string) {
    const nextSearchParams = buildSearchParams(1, nextDepartmentSlug)
    setSearchParams(nextSearchParams)
    setIsFilterPopoverOpen(false)
  }

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (initialPage <= 1) {
      return
    }

    if (totalPages === 0) {
      const nextSearchParams = buildSearchParams(1, normalizedDepartmentSlug)
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }

      return
    }

    if (initialPage > totalPages) {
      const nextSearchParams = buildSearchParams(totalPages, normalizedDepartmentSlug)
      const nextSearchParamsString = nextSearchParams.toString()

      if (currentSearchParams !== nextSearchParamsString) {
        setSearchParams(nextSearchParams, { replace: true })
      }
    }
  }, [
    currentSearchParams,
    initialPage,
    isLoading,
    normalizedDepartmentSlug,
    setSearchParams,
    totalPages,
  ])

  function goToPreviousPage() {
    const nextSearchParams = buildSearchParams(Math.max(1, initialPage - 1), normalizedDepartmentSlug)
    setSearchParams(nextSearchParams)
  }

  function goToNextPage() {
    const boundedNextPage =
      totalPages > 0 ? Math.min(totalPages, initialPage + 1) : initialPage + 1
    const nextSearchParams = buildSearchParams(boundedNextPage, normalizedDepartmentSlug)
    setSearchParams(nextSearchParams)
  }

  return (
    <div className="space-y-8 pb-16 pt-8 sm:space-y-10 sm:pb-20 sm:pt-10 lg:space-y-12 lg:pb-24 lg:pt-12">
      <section className="w-full space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <h1 className="min-w-0 max-w-4xl flex-1 font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
            <span className="block truncate">{headingTitle}</span>
          </h1>

          <div ref={filterPopoverRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="Abrir filtros"
              aria-haspopup="dialog"
              aria-expanded={isFilterPopoverOpen}
              onClick={() => {
                setIsFilterPopoverOpen((currentValue) => !currentValue)
              }}
              className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/6 px-4 text-brand-100 transition hover:bg-white/10 hover:text-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              <span className="hidden text-sm font-medium text-brand-100 sm:inline">
                Filtrar por
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
                <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
              </svg>
            </button>

            {isFilterPopoverOpen ? (
              <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#14110f] p-3 shadow-[0_22px_48px_rgba(0,0,0,0.38)]">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-100/52">
                      Departamento
                    </p>
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateDepartmentFilter('')
                        }}
                        className={`flex w-full items-center justify-between gap-4 rounded-[0.9rem] px-3 py-2.5 text-left text-sm transition ${
                          normalizedDepartmentSlug === ''
                            ? 'bg-brand-300 text-brand-950'
                            : 'text-brand-100 hover:bg-white/6'
                        }`}
                      >
                        <span className="min-w-0 truncate">Todo Uruguay</span>
                      </button>

                      {availableDepartments.map((department) => (
                        <button
                          key={department.id}
                          type="button"
                          onClick={() => {
                            updateDepartmentFilter(department.slug)
                          }}
                          className={`flex w-full items-center justify-between gap-4 rounded-[0.9rem] px-3 py-2.5 text-left text-sm transition ${
                            normalizedDepartmentSlug === department.slug
                              ? 'bg-brand-300 text-brand-950'
                              : 'text-brand-100 hover:bg-white/6'
                          }`}
                        >
                          <span className="min-w-0 truncate">{department.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {isDepartmentsLoading ? (
                    <p className="text-xs text-brand-100/52">Cargando departamentos...</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <p className="max-w-3xl text-sm leading-6 text-brand-100/68 sm:text-base sm:leading-7">
          Explorá nuestra selección de {categorySubtitleName} y encontrá el espacio que mejor se adapte a las necesidades de tu próxima producción.
        </p>
      </section>

      {isLoading ? (
        <RouteLoadingFallback label="Cargando locaciones..." />
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="text-lg font-semibold">No se pudieron cargar las locaciones</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && !categoryExists ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-950">Categoria no encontrada</h2>
          <p className="mt-2 text-sm text-sand-700">
            No pudimos encontrar la categoria "{slug}".
          </p>
        </section>
      ) : null}

      {!isLoading && !error && categoryExists && locations.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-950">No encontramos resultados</h2>
          <p className="mt-2 text-sm text-sand-700">
            {hasActiveSearch
              ? `No encontramos locaciones publicadas para esta categoria y la busqueda "${trimmedSearchQuery}".`
              : 'No encontramos locaciones publicadas para esta categoria.'}
          </p>
        </section>
      ) : null}

      {!isDataLoading && !error && categoryExists && locations.length > 0 ? (
        <section
          className={
            isWaitingForCriticalImages
              ? 'pointer-events-none invisible max-h-0 overflow-hidden'
              : ''
          }
          aria-hidden={isWaitingForCriticalImages}
        >
          <CategoryLocationsGrid
            locations={locations}
            onCriticalImageSettled={() => {
              setResolvedCriticalImagesCount((currentCount) => currentCount + 1)
            }}
          />
        </section>
      ) : null}

      {!isLoading && !error && categoryExists && locations.length > 0 ? (
        <>
          {totalPages > 1 ? (
            <SearchResultsPagination
              currentPage={initialPage}
              totalPages={totalPages}
              onNextPage={goToNextPage}
              onPreviousPage={goToPreviousPage}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}

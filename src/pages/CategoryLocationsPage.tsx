import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { CategoryLocationsGrid } from '@/features/locations/components/CategoryLocationsGrid.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { RouteLoadingFallback } from '@/routes/RouteLoadingFallback.tsx'
import { getLocations } from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

const CRITICAL_IMAGE_TIMEOUT_MS = 2000

function getCriticalImageCount(totalImages: number) {
  const maxCriticalImages =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 2
      : 4

  return Math.min(totalImages, maxCriticalImages)
}

export function CategoryLocationsPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q')
  const featuresQuery = searchParams.get('features')

  const [locations, setLocations] = useState<PublicLocationCard[]>([])
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null)
  const [categoryExists, setCategoryExists] = useState(true)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [resolvedCriticalImagesCount, setResolvedCriticalImagesCount] = useState(0)
  const [isWaitingForCriticalImages, setIsWaitingForCriticalImages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedSearchQuery = searchQuery?.trim() ?? ''
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
  const criticalImageCount = getCriticalImageCount(locations.length)

  const activeHeadingParts = [
    `Categoria: ${headingTitle}`,
    hasActiveSearch ? `Busqueda: "${trimmedSearchQuery}"` : null,
  ].filter((part): part is string => Boolean(part))

  usePageTitle(activeHeadingParts.length > 0 ? activeHeadingParts.join(' · ') : 'Categoria')

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
        setIsWaitingForCriticalImages(nextCriticalImageCount > 0)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setLocations([])
        setActiveCategoryName(null)
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
  }, [normalizedFeatureSlugs, slug, trimmedSearchQuery])

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

  return (
    <div className="space-y-8 pb-16 pt-8 sm:space-y-10 sm:pb-20 sm:pt-10 lg:space-y-12 lg:pb-24 lg:pt-12">
      <section className="max-w-4xl">
        <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
          {headingTitle}
        </h1>
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
    </div>
  )
}

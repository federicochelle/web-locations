import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { LocationsGrid } from '@/features/locations/components/LocationsGrid.tsx'
import { useFavorites } from '@/hooks/useFavorites.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

export function LocationsPage() {
  const [searchParams] = useSearchParams()
  const categorySlug = searchParams.get('category')
  const searchQuery = searchParams.get('q')
  const featuresQuery = searchParams.get('features')

  const [locations, setLocations] = useState<PublicLocationCard[]>([])
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null)
  const [categoryExists, setCategoryExists] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
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
  const hasActiveSearch = trimmedSearchQuery.length > 0
  const {
    favoriteIds,
    pendingIds,
    toggleFavorite,
  } = useFavorites()

  const activeHeadingParts = [
    activeCategoryName ? `Categoria: ${activeCategoryName}` : null,
    hasActiveSearch ? `Busqueda: "${trimmedSearchQuery}"` : null,
  ].filter((part): part is string => Boolean(part))

  usePageTitle(activeHeadingParts.length > 0 ? activeHeadingParts.join(' · ') : 'Locaciones')

  useEffect(() => {
    let isMounted = true

    async function loadLocations() {
      try {
        setIsLoading(true)
        setError(null)
        setCategoryExists(true)

        const result = await getLocations({
          categorySlug,
          search: trimmedSearchQuery,
          featureSlugs: normalizedFeatureSlugs,
        })

        if (!isMounted) {
          return
        }

        setLocations(result.locations)
        setActiveCategoryName(result.activeCategory?.name ?? null)
        setCategoryExists(result.categoryExists)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setActiveCategoryName(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las locaciones.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLocations()

    return () => {
      isMounted = false
    }
  }, [categorySlug, normalizedFeatureSlugs, trimmedSearchQuery])

  return (
    <div className="space-y-6 pb-16 pt-6 sm:pb-20 sm:pt-8 lg:pb-24 lg:pt-10">
      {isLoading ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[16/13] animate-pulse rounded-[1.75rem] bg-sand-200 lg:aspect-[16/12]"
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="text-lg font-semibold">No se pudieron cargar las locaciones</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && locations.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-950">
            {categorySlug && !categoryExists
              ? 'Categoria no encontrada'
              : 'No encontramos resultados'}
          </h2>
          <p className="mt-2 text-sm text-sand-700">
            {categorySlug && !categoryExists
              ? `No pudimos encontrar la categoria "${categorySlug}".`
              : categorySlug && hasActiveSearch
              ? `No encontramos locaciones publicadas para la categoria seleccionada y la busqueda "${trimmedSearchQuery}".`
              : categorySlug
              ? 'No encontramos locaciones publicadas para esta categoria.'
              : hasActiveSearch
              ? `No encontramos locaciones publicadas para la busqueda "${trimmedSearchQuery}".`
              : 'Cuando existan registros publicados en Supabase, apareceran aqui.'}
          </p>
        </section>
      ) : null}

      {!isLoading && !error && locations.length > 0 ? (
        <LocationsGrid
          locations={locations}
          favoriteIds={favoriteIds}
          pendingFavoriteIds={pendingIds}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}
    </div>
  )
}

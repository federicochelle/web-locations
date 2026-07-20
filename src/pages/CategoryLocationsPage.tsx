import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'

import { CategoryLocationsGrid } from '@/features/locations/components/CategoryLocationsGrid.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

export function CategoryLocationsPage() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
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

  const activeHeadingParts = [
    activeCategoryName ? `Categoria: ${activeCategoryName}` : null,
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
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setCategoryExists(true)

        const result = await getLocations({
          categorySlug: slug,
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

        setLocations([])
        setActiveCategoryName(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar las locaciones de la categoria.',
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
  }, [normalizedFeatureSlugs, slug, trimmedSearchQuery])

  return (
    <div className="space-y-8 pb-16 pt-8 sm:space-y-10 sm:pb-20 sm:pt-10 lg:space-y-12 lg:pb-24 lg:pt-12">
      <section className="max-w-4xl">
        <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
          {activeCategoryName ?? 'Locaciones'}
        </h1>
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

      {!isLoading && !error && categoryExists && locations.length > 0 ? (
        <CategoryLocationsGrid locations={locations} />
      ) : null}
    </div>
  )
}

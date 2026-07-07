import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { LocationCard } from '@/features/locations/components/LocationCard.tsx'
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
  const normalizedFeatureSlugs = (featuresQuery ?? '')
    .split(',')
    .map((featureSlug) => featureSlug.trim())
    .filter((featureSlug) => featureSlug.length > 0)
  const hasActiveSearch = trimmedSearchQuery.length > 0

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
  }, [categorySlug, trimmedSearchQuery, featuresQuery])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-sand-500">
              Exploracion publica
            </p>
            <h1 className="text-2xl font-semibold text-brand-950">
              {activeHeadingParts.length > 0
                ? activeHeadingParts.join(' · ')
                : 'Todas las locaciones'}
            </h1>
            {(categorySlug || hasActiveSearch) && !isLoading && !error ? (
              <p className="text-sm text-sand-700">
                {!categoryExists && categorySlug
                  ? `La categoria "${categorySlug}" no existe o no esta disponible.`
                  : 'Estas viendo resultados filtrados.'}
              </p>
            ) : (
              <p className="text-sm text-sand-700">
                Explora las locaciones publicadas disponibles.
              </p>
            )}
          </div>

          {(categorySlug || hasActiveSearch) ? (
            <Link
              to="/locations"
              className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm text-brand-950 transition hover:bg-sand-50"
            >
              Ver todas
            </Link>
          ) : null}
        </div>
      </section>

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
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

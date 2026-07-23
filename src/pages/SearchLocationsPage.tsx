import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

import { LocationCard } from '@/features/locations/components/LocationCard.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocations } from '@/services/locations.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

export function SearchLocationsPage() {
  const [searchParams] = useSearchParams()
  const categoryQuery = searchParams.get('category')
  const searchQuery = searchParams.get('q')
  const featuresQuery = searchParams.get('features')

  const [locations, setLocations] = useState<PublicLocationCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const normalizedCategorySlug = categoryQuery?.trim() ?? ''
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
  const hasActiveFeatures = normalizedFeatureSlugs.length > 0
  const hasValidSearch =
    Boolean(normalizedCategorySlug) ||
    hasActiveSearch ||
    hasActiveFeatures

  usePageTitle('Resultados de busqueda')

  useEffect(() => {
    if (!hasValidSearch) {
      return
    }

    let isMounted = true

    async function loadLocations() {
      try {
        setIsLoading(true)
        setError(null)

        const result = await getLocations({
          categorySlug: normalizedCategorySlug || null,
          search: trimmedSearchQuery,
          featureSlugs: normalizedFeatureSlugs,
        })

        if (!isMounted) {
          return
        }

        setLocations(result.locations)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setLocations([])
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudieron cargar los resultados de la busqueda.',
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
  }, [hasValidSearch, normalizedCategorySlug, normalizedFeatureSlugs, trimmedSearchQuery])

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
          {hasActiveSearch ? (
            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              Busqueda: "{trimmedSearchQuery}"
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
          <section className="w-full">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

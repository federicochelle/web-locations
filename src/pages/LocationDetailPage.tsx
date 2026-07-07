import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { FavoriteButton } from '@/components/ui/FavoriteButton.tsx'
import { useFavorites } from '@/hooks/useFavorites.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocationByLocationCode } from '@/services/locations.service.ts'
import type { PublicLocationDetail } from '@/types/location.ts'

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function LocationDetailPage() {
  const { slug: publicSlug } = useParams()
  const [location, setLocation] = useState<PublicLocationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const { favoriteIds, pendingIds, toggleFavorite } = useFavorites()

  usePageTitle(location?.locationCode ?? 'Detalle de locacion')

  useEffect(() => {
    let isMounted = true

    async function loadLocation() {
      if (!publicSlug) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setNotFound(false)

        const nextLocation = await getLocationByLocationCode(publicSlug)

        if (!isMounted) {
          return
        }

        if (!nextLocation) {
          setNotFound(true)
          setLocation(null)
          return
        }

        setLocation(nextLocation)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la locacion.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLocation()

    return () => {
      isMounted = false
    }
  }, [publicSlug])

  if (notFound) {
    return <Navigate replace to="/404" />
  }

  return (
    <div className="space-y-6">
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
          <h2 className="text-lg font-semibold">No se pudo cargar la locacion</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && location ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto space-y-4 max-w-[1720px]">
            <Link
              to="/locations"
              className="inline-flex items-center justify-center rounded-full border border-black/10 px-4 py-2 text-sm text-brand-950 transition hover:bg-sand-50"
            >
              ← Volver a locaciones
            </Link>
            <div className="flex items-center justify-between gap-4">
              <p className="px-1 font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-300 sm:text-4xl">
                {formatLocationCode(location.locationCode)}
              </p>
              <FavoriteButton
                active={favoriteIds.has(location.id)}
                loading={pendingIds.includes(location.id)}
                onClick={() => {
                  void toggleFavorite({ id: location.id })
                }}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {location.images.length > 0 ? (
                location.images.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className="overflow-hidden rounded-[1.75rem]"
                  >
                    <div
                      className="aspect-[16/13] bg-cover bg-center lg:aspect-[16/12]"
                      style={{ backgroundImage: `url(${image.url})` }}
                    />
                  </div>
                ))
              ) : (
                <div className="aspect-[16/13] rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] lg:aspect-[16/12]" />
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

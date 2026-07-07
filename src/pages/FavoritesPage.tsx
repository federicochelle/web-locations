import { Link } from 'react-router-dom'

import { LocationsGrid } from '@/features/locations/components/LocationsGrid.tsx'
import { useFavorites } from '@/hooks/useFavorites.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'

export function FavoritesPage() {
  usePageTitle('Favoritos')

  const {
    favorites,
    favoriteIds,
    isLoading,
    error,
    pendingIds,
    toggleFavorite,
  } = useFavorites()

  return (
    <div className="space-y-6 pt-6 sm:pt-8 lg:pt-10">
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
          <h2 className="text-lg font-semibold">No se pudieron cargar los favoritos</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && favorites.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-950">
            No tienes locaciones favoritas todavia.
          </h2>
          <p className="mt-2 text-sm text-sand-700">
            Cuando guardes locaciones, apareceran aqui para encontrarlas mas rapido.
          </p>
          <Link
            to="/locations"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Explorar locaciones
          </Link>
        </section>
      ) : null}

      {!isLoading && !error && favorites.length > 0 ? (
        <LocationsGrid
          locations={favorites}
          favoriteIds={favoriteIds}
          pendingFavoriteIds={pendingIds}
          onToggleFavorite={toggleFavorite}
        />
      ) : null}
    </div>
  )
}

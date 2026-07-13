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
    <div className="space-y-8 pb-16 pt-8 sm:space-y-10 sm:pb-20 sm:pt-10 lg:space-y-10 lg:pb-28 lg:pt-12">
      <section className="max-w-6xl space-y-5">
        <div className="space-y-3">
          <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
            Favoritos
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
            Guarda locaciones para revisarlas mas adelante o incluirlas en tus
            proyectos.
          </p>
        </div>
      </section>

      {isLoading ? (
        <section className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:gap-7">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[16/11] animate-pulse rounded-[0.9rem] bg-sand-200/80"
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
        <section className="rounded-[2rem] border border-white/10 bg-white px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.18)] sm:px-8 sm:py-10">
          <div className="max-w-2xl space-y-4">
            <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-950 sm:text-4xl">
              Aun no guardaste ninguna locacion
            </h2>
            <p className="text-sm leading-6 text-sand-700 sm:text-base">
              Explora el catalogo y marca con el corazon las locaciones que quieras
              revisar mas adelante.
            </p>
          </div>

          <div className="mt-6">
            <Link
              to="/locations"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Explorar locaciones
            </Link>
          </div>
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

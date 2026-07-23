import { FavoritesEmptyState } from '@/components/favorites/FavoritesEmptyState.tsx'
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
        <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
          Favoritos
        </h1>
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
        <FavoritesEmptyState />
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

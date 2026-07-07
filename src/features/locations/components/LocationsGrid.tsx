import { LocationCard } from '@/features/locations/components/LocationCard.tsx'
import type { PublicLocationCard } from '@/types/location.ts'

type LocationsGridProps = {
  locations: PublicLocationCard[]
  favoriteIds?: Set<string>
  pendingFavoriteIds?: string[]
  onToggleFavorite?: (location: PublicLocationCard) => void
}

export function LocationsGrid({
  locations,
  favoriteIds,
  pendingFavoriteIds,
  onToggleFavorite,
}: LocationsGridProps) {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
      <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            location={location}
            isFavorite={favoriteIds?.has(location.id) ?? false}
            isFavoriteLoading={pendingFavoriteIds?.includes(location.id) ?? false}
            onToggleFavorite={
              onToggleFavorite ? () => onToggleFavorite(location) : undefined
            }
          />
        ))}
      </div>
    </section>
  )
}

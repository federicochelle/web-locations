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
    <section className="w-full">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

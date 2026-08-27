import { LocationCard } from '@/features/locations/components/LocationCard.tsx'
import type { PublicLocationCard } from '@/types/location.ts'

type CategoryLocationsGridProps = {
  locations: PublicLocationCard[]
  onCriticalImageSettled?: () => void
}

export function CategoryLocationsGrid({
  locations,
  onCriticalImageSettled,
}: CategoryLocationsGridProps) {
  const criticalImageCount = Math.min(
    locations.length,
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 2
      : 4,
  )

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
      <div className="mx-auto grid max-w-[1720px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {locations.map((location, index) => (
          <LocationCard
            key={location.id}
            location={location}
            imageLoading={index < 4 ? 'eager' : 'lazy'}
            imageFetchPriority={index < 2 ? 'high' : 'auto'}
            onImageSettled={index < criticalImageCount ? onCriticalImageSettled : undefined}
          />
        ))}
      </div>
    </section>
  )
}

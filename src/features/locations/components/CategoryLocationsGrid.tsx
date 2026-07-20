import { LocationCard } from '@/features/locations/components/LocationCard.tsx'
import type { PublicLocationCard } from '@/types/location.ts'

type CategoryLocationsGridProps = {
  locations: PublicLocationCard[]
}

export function CategoryLocationsGrid({
  locations,
}: CategoryLocationsGridProps) {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
      <div className="mx-auto grid max-w-[1720px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {locations.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>
    </section>
  )
}

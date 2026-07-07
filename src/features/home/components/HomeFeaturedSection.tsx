import { Link } from 'react-router-dom'

import { SectionHeading } from '@/components/ui/SectionHeading.tsx'
import { LocationCard } from '@/features/locations/components/LocationCard.tsx'
import type { PublicLocationCard } from '@/types/location.ts'

type HomeFeaturedSectionProps = {
  locations: PublicLocationCard[]
}

export function HomeFeaturedSection({
  locations,
}: HomeFeaturedSectionProps) {
  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          eyebrow="Destacadas"
          title="Selección curada"
          description="Módulo inicial para futuras destacadas dinámicas desde Supabase o CMS."
        />
        <Link
          to="/locations"
          className="inline-flex items-center justify-center rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-brand-950 transition hover:bg-white"
        >
          Ver catálogo completo
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {locations.map((location) => (
          <LocationCard key={location.id} location={location} />
        ))}
      </div>
    </section>
  )
}

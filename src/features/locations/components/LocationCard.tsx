import { Link } from 'react-router-dom'

import type { PublicLocationCard } from '@/types/location.ts'

type LocationCardProps = {
  location: PublicLocationCard
}

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function LocationCard({ location }: LocationCardProps) {
  return (
    <Link
      to={`/locations/${location.slug}`}
      aria-label={location.locationCode}
      className="group relative block overflow-hidden rounded-[1.75rem] transition hover:-translate-y-0.5"
    >
      <div className="aspect-[16/13] bg-sand-100 lg:aspect-[16/12]">
        <div
          className="h-full w-full bg-cover bg-center"
          style={{
            backgroundImage: location.coverImageUrl
              ? `url(${location.coverImageUrl})`
              : 'linear-gradient(135deg, rgba(124, 91, 66, 0.55), rgba(32, 23, 18, 0.92))',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_42%,rgba(0,0,0,0.4)_100%)] transition group-hover:scale-[1.02]" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-display text-3xl leading-none text-brand-100">
            {formatLocationCode(location.locationCode)}
          </p>
        </div>
      </div>
    </Link>
  )
}

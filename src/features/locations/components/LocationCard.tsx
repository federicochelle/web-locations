import { Link } from 'react-router-dom'

import { FavoriteButton } from '@/components/ui/FavoriteButton.tsx'
import type { PublicLocationCard } from '@/types/location.ts'

type LocationCardProps = {
  location: PublicLocationCard
  isFavorite?: boolean
  isFavoriteLoading?: boolean
  onToggleFavorite?: () => void
}

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function LocationCard({
  location,
  isFavorite = false,
  isFavoriteLoading = false,
  onToggleFavorite,
}: LocationCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[0.65rem] bg-brand-950 shadow-[0_20px_44px_rgba(0,0,0,0.14)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_64px_rgba(0,0,0,0.22)]">
      {onToggleFavorite ? (
        <div className="absolute right-4 top-4 z-10">
          <FavoriteButton
            active={isFavorite}
            loading={isFavoriteLoading}
            onClick={() => {
              onToggleFavorite()
            }}
          />
        </div>
      ) : null}

      <Link
        to={`/locations/${location.slug}`}
        aria-label={location.locationCode}
        className="block"
      >
        <div className="aspect-[16/13] bg-sand-100 lg:aspect-[16/12]">
        <div
          className="h-full w-full bg-cover bg-center transition duration-700 ease-out group-hover:scale-[1.06]"
          style={{
            backgroundImage: location.coverImageUrl
              ? `url(${location.coverImageUrl})`
              : 'linear-gradient(135deg, rgba(155, 120, 88, 0.55), rgba(32, 23, 18, 0.92))',
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.01)_0%,rgba(0,0,0,0.08)_30%,rgba(0,0,0,0.7)_100%)] transition duration-500 group-hover:opacity-95" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.76)_100%)] opacity-95 transition duration-500 group-hover:h-32" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)]">
            {formatLocationCode(location.locationCode)}
          </p>
        </div>
        </div>
      </Link>
    </article>
  )
}

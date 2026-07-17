import { Link } from 'react-router-dom'

import type { SelectedLocationImage } from '@/types/image-selection.ts'
import { buildPublicLocationPath } from '@/utils/location-public.ts'

type SelectedLocationGroupProps = {
  locationId: string
  locationCode: string
  categorySlug: string
  locationTitle: string
  images: SelectedLocationImage[]
  onNavigate: () => void
  onRemoveLocation: (locationId: string) => void
}

export function SelectedLocationGroup({
  locationId,
  locationCode,
  categorySlug,
  locationTitle,
  images,
  onNavigate,
  onRemoveLocation,
}: SelectedLocationGroupProps) {
  const locationPath = buildPublicLocationPath({
    categorySlug,
    locationCode,
  })
  const coverImage = images[0]
  return (
    <section className="group overflow-hidden border border-white/10 bg-white/4">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            onRemoveLocation(locationId)
          }}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/70 text-white opacity-0 transition hover:bg-black/85 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
          aria-label={`Quitar locacion ${locationCode} de la seleccion`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
      <Link
        to={locationPath}
        onClick={onNavigate}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
        aria-label={`Ver locacion ${locationTitle}`}
      >
        <div className="relative">
          <div className="aspect-[21/9] overflow-hidden bg-white/6">
            {coverImage ? (
              <img
                src={coverImage.imageUrl}
                alt={`Imagen seleccionada de ${locationCode}`}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            ) : null}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#14110f] via-[#14110f]/10 to-transparent" />
          <div className="absolute bottom-3 right-3 inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-black/75 px-3 text-xs font-semibold text-white">
            {images.length}
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
              {locationCode}
            </p>
          </div>
        </div>
      </Link>
    </section>
  )
}

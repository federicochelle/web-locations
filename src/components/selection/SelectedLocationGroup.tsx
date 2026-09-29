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
    locationId,
    locationCode,
  })
  const coverImage = images[0]
  return (
    <section className="group overflow-hidden border border-white/10 bg-white/4">
      <div className="relative">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onRemoveLocation(locationId)
          }}
          className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-black/72 text-white opacity-100 transition hover:bg-black/85 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
          aria-label={`Eliminar locación ${locationCode}`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4.5 w-4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 4h6" />
            <path d="M10 4l.75-1h2.5L14 4" />
            <path d="M5 7h14" />
            <path d="M7 7l1 13h8l1-13" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
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

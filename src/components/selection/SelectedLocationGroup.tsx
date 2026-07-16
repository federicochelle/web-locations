import { Link } from 'react-router-dom'

import { SelectedImageCard } from '@/components/selection/SelectedImageCard.tsx'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import { buildPublicLocationPath } from '@/utils/location-public.ts'

type SelectedLocationGroupProps = {
  locationCode: string
  categorySlug: string
  locationTitle: string
  images: SelectedLocationImage[]
  onRemoveImage: (key: string) => void
  onNavigate: () => void
}

export function SelectedLocationGroup({
  locationCode,
  categorySlug,
  locationTitle,
  images,
  onRemoveImage,
  onNavigate,
}: SelectedLocationGroupProps) {
  const locationPath = buildPublicLocationPath({
    categorySlug,
    locationCode,
  })

  return (
    <section className="space-y-3 rounded-[1.5rem] border border-white/10 bg-white/4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold leading-none tracking-[-0.03em] text-brand-100">
            {locationCode}
          </h3>
          <p className="mt-2 text-sm text-brand-300">
            {images.length} {images.length === 1 ? 'imagen' : 'imagenes'}
          </p>
        </div>
        <Link
          to={locationPath}
          onClick={onNavigate}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-white/12 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f]"
          aria-label={`Ver locacion ${locationTitle}`}
        >
          Ver locacion
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {images.map((image) => (
          <SelectedImageCard
            key={image.key}
            image={image}
            onRemove={onRemoveImage}
          />
        ))}
      </div>
    </section>
  )
}

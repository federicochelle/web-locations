import { Link } from 'react-router-dom'

import type { RequestProjectLocation } from '@/types/request-project.ts'
import { buildPublicLocationPath } from '@/utils/location-public.ts'

type RequestProjectLocationCardProps = {
  item: RequestProjectLocation
  canRemove?: boolean
  isRemoving?: boolean
  onRemove?: (locationId: string) => void
}

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function RequestProjectLocationCard({
  item,
  canRemove = false,
  isRemoving = false,
  onRemove,
}: RequestProjectLocationCardProps) {
  const locationTitle = formatLocationCode(item.location.locationCode)

  return (
    <article className="group relative overflow-hidden rounded-none border-x-0 border-y border-white/10 bg-[#1B1B1D] sm:rounded-[0.75rem] sm:border">
      <Link
        to={buildPublicLocationPath({
          categorySlug: item.location.categorySlug,
          locationCode: item.location.locationCode,
          fallbackSlug: item.location.slug,
        })}
        aria-label={`Ver locacion ${locationTitle}`}
        className="absolute inset-0 z-10"
      />

      {canRemove && onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(item.location.id)}
          disabled={isRemoving}
          className="absolute right-3 top-3 z-20 inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-black/55 px-4 text-sm font-medium text-brand-100 opacity-0 transition duration-200 hover:bg-black/72 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRemoving ? 'Quitando...' : 'Quitar'}
        </button>
      ) : null}

      <div className="grid md:grid-cols-[minmax(0,1fr)]">
        <div className="block h-full min-h-[220px] bg-sand-100">
          {item.location.coverImageUrl ? (
            <div
              className="h-full min-h-[220px] bg-cover bg-center"
              style={{
                backgroundImage: `url(${item.location.coverImageUrl})`,
              }}
            />
          ) : (
            <div className="h-full min-h-[220px] bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))]" />
          )}
        </div>

        <div className="relative z-20 space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-100 transition">
                {locationTitle}
              </p>
            </div>

            <span className="inline-flex items-center text-sm font-medium text-brand-300 transition">
              Ver locacion →
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

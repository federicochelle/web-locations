import { Link } from 'react-router-dom'

import type { RequestProjectLocation } from '@/types/request-project.ts'

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
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-sm">
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        <Link
          to={`/locations/${item.location.slug}`}
          className="block h-full min-h-[220px] bg-sand-100"
        >
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
        </Link>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sand-700">
                {item.location.categoryName}
              </p>
              <div className="space-y-1">
                <Link
                  to={`/locations/${item.location.slug}`}
                  className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-950 transition hover:text-brand-700"
                >
                  {formatLocationCode(item.location.locationCode)}
                </Link>
                <p className="text-sm text-sand-700">
                  {item.location.departmentName} · {item.location.zoneName}
                </p>
              </div>
            </div>

            {canRemove && onRemove ? (
              <button
                type="button"
                onClick={() => onRemove(item.location.id)}
                disabled={isRemoving}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-brand-950 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isRemoving ? 'Quitando...' : 'Quitar'}
              </button>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-4 py-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-sand-700">
              Codigo
            </p>
            <p className="mt-2 text-sm leading-6 text-brand-950">{item.location.locationCode}</p>
          </div>
        </div>
      </div>
    </article>
  )
}

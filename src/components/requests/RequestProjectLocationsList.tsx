import { Link } from 'react-router-dom'

import { RequestProjectLocationCard } from '@/components/requests/RequestProjectLocationCard.tsx'
import type { RequestProjectLocation } from '@/types/request-project.ts'

type RequestProjectLocationsListProps = {
  locations: RequestProjectLocation[]
  isLoading?: boolean
  canRemove?: boolean
  removingLocationIds?: string[]
  onRemove?: (locationId: string) => void
}

export function RequestProjectLocationsList({
  locations,
  isLoading = false,
  canRemove = false,
  removingLocationIds = [],
  onRemove,
}: RequestProjectLocationsListProps) {
  if (isLoading) {
    return (
      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[240px] animate-pulse rounded-[1.75rem] bg-sand-200"
          />
        ))}
      </section>
    )
  }

  if (locations.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-brand-950">
          Todavia no agregaste locaciones.
        </h2>
        <p className="mt-2 text-sm text-sand-700">
          Cuando sumes locaciones al proyecto, apareceran aqui para revisarlas antes de enviar la solicitud.
        </p>
        <Link
          to="/locations"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Explorar locaciones
        </Link>
      </section>
    )
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      {locations.map((item) => (
        <RequestProjectLocationCard
          key={item.id}
          item={item}
          canRemove={canRemove}
          isRemoving={removingLocationIds.includes(item.location.id)}
          onRemove={onRemove}
        />
      ))}
    </section>
  )
}

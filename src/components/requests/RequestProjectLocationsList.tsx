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
      <section className="-mx-6 grid gap-4 sm:mx-0 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[240px] animate-pulse rounded-none bg-sand-200 sm:rounded-[1.75rem]"
          />
        ))}
      </section>
    )
  }

  if (locations.length === 0) {
    return (
      <section className="rounded-none border-x-0 border-y border-white/10 bg-[#1B1B1D] p-6 sm:rounded-[1.75rem] sm:border">
        <h2 className="text-lg font-semibold text-brand-100">
          Todavia no agregaste locaciones.
        </h2>
        <p className="mt-2 text-sm text-brand-100/68">
          Cuando sumes locaciones al proyecto, apareceran aqui para revisarlas antes de enviar la solicitud.
        </p>
        <Link
          to="/#explorar"
          className="mt-5 inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Explorar locaciones
        </Link>
      </section>
    )
  }

  return (
    <section className="-mx-6 grid gap-4 sm:mx-0 lg:grid-cols-3">
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

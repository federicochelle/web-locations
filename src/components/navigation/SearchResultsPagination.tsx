type SearchResultsPaginationProps = {
  currentPage: number
  totalPages: number
  onNextPage: () => void
  onPreviousPage: () => void
}

export function SearchResultsPagination({
  currentPage,
  totalPages,
  onNextPage,
  onPreviousPage,
}: SearchResultsPaginationProps) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-[#14110f] p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-100/68">
          Página {currentPage}
          {totalPages > 0 ? ` de ${totalPages}` : ''}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={currentPage <= 1}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={onNextPage}
            disabled={totalPages > 0 ? currentPage >= totalPages : false}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-300 px-4 text-sm font-medium text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </section>
  )
}

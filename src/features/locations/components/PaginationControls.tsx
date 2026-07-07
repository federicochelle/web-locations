export function PaginationControls() {
  return (
    <div className="flex flex-col gap-4 rounded-[1.5rem] border border-black/5 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-sand-700">Mostrando 1-6 de 24 locaciones.</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-full border border-black/10 px-4 py-2 text-sm text-sand-700 transition hover:bg-sand-50"
        >
          Anterior
        </button>
        <button
          type="button"
          className="rounded-full bg-brand-500 px-4 py-2 text-sm text-white"
        >
          1
        </button>
        <button
          type="button"
          className="rounded-full border border-black/10 px-4 py-2 text-sm text-sand-700 transition hover:bg-sand-50"
        >
          2
        </button>
        <button
          type="button"
          className="rounded-full border border-black/10 px-4 py-2 text-sm text-sand-700 transition hover:bg-sand-50"
        >
          3
        </button>
        <button
          type="button"
          className="rounded-full border border-black/10 px-4 py-2 text-sm text-sand-700 transition hover:bg-sand-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}

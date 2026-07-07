const mockFilters = ['Todas', 'Montevideo', 'Interior', 'Casas', 'Industrial', 'Con exterior']

export function LocationsFilters() {
  return (
    <div className="flex flex-wrap gap-3">
      {mockFilters.map((filter, index) => (
        <button
          key={filter}
          type="button"
          className={`rounded-full px-4 py-2 text-sm transition ${
            index === 0
              ? 'bg-brand-500 text-white'
              : 'border border-black/10 bg-white text-sand-700 hover:bg-sand-50'
          }`}
        >
          {filter}
        </button>
      ))}
    </div>
  )
}

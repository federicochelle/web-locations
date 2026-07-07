type SearchBarProps = {
  placeholder: string
  buttonLabel?: string
}

export function SearchBar({
  placeholder,
  buttonLabel = 'Buscar',
}: SearchBarProps) {
  return (
    <form className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-white p-4 shadow-sm sm:flex-row">
      <input
        type="search"
        placeholder={placeholder}
        className="min-h-12 flex-1 rounded-2xl border border-sand-200 bg-sand-50 px-4 text-sm text-brand-950 outline-none transition placeholder:text-sand-400 focus:border-brand-300"
      />
      <button
        type="button"
        className="min-h-12 rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        {buttonLabel}
      </button>
    </form>
  )
}

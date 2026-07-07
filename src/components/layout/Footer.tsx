import logoUrl from '../../../logo.webp'

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#14110f] text-white/70">
      <div className="page-shell flex flex-col gap-2 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={logoUrl}
            alt="Locaciones"
            className="h-16 w-auto object-contain"
          />
          <p className="text-brand-300">Locaciones</p>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-brand-300/60">
          Base pública
        </p>
      </div>
    </footer>
  )
}

import { SearchBar } from '@/components/ui/SearchBar.tsx'

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-[linear-gradient(135deg,rgba(124,91,66,0.12),rgba(255,255,255,0.9))] px-6 py-12 shadow-sm sm:px-10 sm:py-16">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand-100 blur-3xl" />
      <div className="relative space-y-8">
        <div className="max-w-3xl space-y-5">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-brand-700">
            Base pública en construcción
          </p>
          <h1 className="font-display text-5xl leading-none text-brand-950 sm:text-7xl">
            Encontrá la locación ideal para tu próxima producción.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-sand-700 sm:text-lg">
            Estructura inicial lista para catálogo, detalle, filtros y futura conexión con Supabase.
          </p>
        </div>

        <SearchBar placeholder="Buscar por nombre, ambiente, departamento o tipo de locación" />
      </div>
    </section>
  )
}

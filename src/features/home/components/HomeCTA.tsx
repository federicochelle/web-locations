import { Link } from 'react-router-dom'

export function HomeCTA() {
  return (
    <section className="rounded-[2rem] bg-brand-950 px-6 py-10 text-white shadow-sm sm:px-10 sm:py-14">
      <div className="max-w-3xl space-y-5">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-brand-100">
          Próxima fase
        </p>
        <h2 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl">
          La base ya está lista para conectar catálogo real, filtros y búsqueda.
        </h2>
        <p className="text-sm leading-7 text-brand-100 sm:text-base">
          Esta sección queda preparada como cierre editorial, bloque comercial o punto de contacto.
        </p>
        <Link
          to="/locations"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-brand-950 transition hover:bg-brand-100"
        >
          Explorar locaciones
        </Link>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'

import { FavoritesEmptyStateIllustration } from '@/components/favorites/FavoritesEmptyStateIllustration.tsx'

export function FavoritesEmptyState() {
  return (
    <section className="mx-auto max-w-5xl px-1 pb-8 pt-2 sm:px-4 sm:pb-10 lg:pb-12">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-14">
        <div className="mx-auto w-full max-w-[28rem] lg:mx-0 lg:max-w-[30rem]">
          <FavoritesEmptyStateIllustration />
        </div>

        <div className="max-w-xl space-y-4 text-center lg:text-left">
          <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.5rem]">
            Aún no guardaste ninguna locación
          </h2>
          <p className="text-sm leading-7 text-brand-100/70 sm:text-base">
            Explorá el catálogo y guardá las locaciones que quieras revisar más adelante o sumar a tus proyectos.
          </p>

          <div className="flex w-full flex-col items-stretch justify-center gap-3 pt-4 sm:flex-row lg:justify-start">
            <Link
              to="/locations"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 sm:flex-1 lg:flex-none"
            >
              Explorar locaciones
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

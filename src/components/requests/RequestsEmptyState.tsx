import { Link } from 'react-router-dom'

import { RequestsEmptyStateIllustration } from '@/components/requests/RequestsEmptyStateIllustration.tsx'

export function RequestsEmptyState() {
  return (
    <section className="mx-auto max-w-5xl px-1 pb-8 pt-2 sm:px-4 sm:pb-10 lg:pb-12">
      <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
        Mis proyectos
      </h1>

      <div className="mt-10 grid items-center gap-10 lg:mt-12 lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:gap-14">
        <div className="mx-auto w-full max-w-[28rem] lg:mx-0 lg:max-w-[30rem]">
          <RequestsEmptyStateIllustration />
        </div>

        <div className="max-w-xl space-y-4 text-center lg:text-left">
          <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-white sm:text-[2.5rem]">
            Todavía no creaste ningún proyecto
          </h2>
          <p className="text-sm leading-7 text-brand-100/70 sm:text-base">
            Creá un proyecto para organizar las locaciones de tu próxima producción.
          </p>

          <div className="flex w-full flex-col items-stretch justify-center gap-3 pt-4 sm:flex-row lg:justify-start">
            <Link
              to="/requests/new"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 sm:flex-1 lg:flex-none"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 fill-current"
              >
                <path d="M9 4a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z" />
              </svg>
              Nuevo proyecto
            </Link>

            <Link
              to="/locations"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/18 bg-transparent px-5 text-sm font-medium text-brand-100 transition hover:border-white/26 hover:bg-white/6 sm:flex-1 lg:flex-none"
            >
              Explorar locaciones
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

import { Link } from 'react-router-dom'

import { RequestProjectStatusBadge } from '@/components/requests/RequestProjectStatusBadge.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function RequestsPage() {
  usePageTitle('Mis proyectos')

  const { error, isLoading, projects } = useRequestProjects()

  return (
    <div className="space-y-8 pb-16 pt-8 sm:space-y-10 sm:pb-20 sm:pt-10 lg:space-y-10 lg:pb-24 lg:pt-12">
      {isLoading ? (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-h-[320px] animate-pulse rounded-[0.75rem] bg-sand-200"
            />
          ))}
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h1 className="text-lg font-semibold">No se pudieron cargar tus proyectos</h1>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && projects.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-brand-950">Mis proyectos</h1>
          <p className="mt-2 text-sm text-sand-700">
            Aun no creaste proyectos de solicitud.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/requests/new"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
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
              className="inline-flex items-center justify-center rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-brand-950 transition hover:bg-sand-50"
            >
              Explorar locaciones
            </Link>
          </div>
        </section>
      ) : null}

      {!isLoading && !error && projects.length > 0 ? (
        <section className="max-w-6xl space-y-8 sm:space-y-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
                Mis proyectos
              </h1>

              <Link
                to="/requests/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
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
            </div>

            <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              Gestiona tus proyectos y prepara las locaciones que quieras consultar.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="overflow-hidden rounded-[0.75rem] border border-white/8 bg-[#1B1B1D]"
              >
                <div className="relative bg-sand-100">
                  {project.locationCount > 1 ? (
                    <div className="absolute left-3 top-3 z-10 inline-flex min-h-8 items-center justify-center rounded-full bg-black/55 px-3 text-sm font-medium text-white backdrop-blur-sm">
                      +{project.locationCount - 1}
                    </div>
                  ) : null}

                  {project.firstLocation?.coverImageUrl ? (
                    <div
                      className="aspect-[4/3] w-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${project.firstLocation.coverImageUrl})`,
                      }}
                    />
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] px-5 text-center text-sm font-medium text-white/88">
                      Sin locaciones
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-col justify-between gap-4 p-4 sm:p-5">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Link
                        to={`/requests/${project.id}`}
                        className="min-w-0 flex-1 font-display text-[1.55rem] font-semibold leading-none tracking-[-0.03em] text-white transition hover:text-brand-100"
                      >
                        {project.title}
                      </Link>

                      <RequestProjectStatusBadge status={project.status} />
                    </div>

                    <p className="text-sm text-brand-100/58">
                      {formatProjectDate(project.updatedAt)}
                    </p>
                  </div>

                  <div>
                    <Link
                      to={`/requests/${project.id}`}
                      className="inline-flex items-center text-sm font-medium text-brand-300 transition hover:text-brand-100 hover:underline"
                    >
                      Ver proyecto
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

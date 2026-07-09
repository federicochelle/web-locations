import { Link } from 'react-router-dom'

import { RequestProjectStatusBadge } from '@/components/requests/RequestProjectStatusBadge.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function RequestsPage() {
  usePageTitle('Mis solicitudes')

  const { error, isLoading, projects } = useRequestProjects()

  return (
    <div className="space-y-6 pt-6 sm:pt-8 lg:pt-10">
      {isLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="min-h-[240px] animate-pulse rounded-[1.75rem] bg-sand-200"
            />
          ))}
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h1 className="text-lg font-semibold">No se pudieron cargar tus solicitudes</h1>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && projects.length === 0 ? (
        <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
          <h1 className="text-lg font-semibold text-brand-950">Mis solicitudes</h1>
          <p className="mt-2 text-sm text-sand-700">
            Aun no creaste proyectos de solicitud.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/requests/new"
              className="inline-flex items-center justify-center rounded-full bg-brand-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Nueva solicitud
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
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-brand-700">
                Solicitudes
              </p>
              <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-950">
                Mis solicitudes
              </h1>
              <p className="text-sm text-sand-700 sm:text-base">
                Gestiona tus proyectos y prepara las locaciones que quieras consultar.
              </p>
            </div>

            <Link
              to="/requests/new"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
            >
              Nueva solicitud
            </Link>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-sand-700">
                        Proyecto
                      </p>
                      <div className="space-y-1">
                        <Link
                          to={`/requests/${project.id}`}
                          className="font-display text-2xl font-semibold leading-none tracking-[-0.03em] text-brand-950 transition hover:text-brand-700"
                        >
                          {project.title}
                        </Link>
                        <p className="text-sm text-sand-700">
                          {project.locationCount} locacion{project.locationCount === 1 ? '' : 'es'} asociada{project.locationCount === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <RequestProjectStatusBadge status={project.status} />
                  </div>

                  <p className="text-sm text-sand-700">
                    Actualizada el {formatProjectDate(project.updatedAt)}
                  </p>

                  <div className="rounded-[1.5rem] border border-black/5 bg-sand-50 px-4 py-4">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-sand-700">
                      Mensaje general
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-brand-950">
                      {project.message ?? 'Todavia no agregaste un mensaje para este proyecto.'}
                    </p>
                  </div>

                  <Link
                    to={`/requests/${project.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium text-brand-950 transition hover:bg-sand-50"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

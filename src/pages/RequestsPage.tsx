import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { RequestsEmptyState } from '@/components/requests/RequestsEmptyState.tsx'
import { RequestProjectStatusBadge } from '@/components/requests/RequestProjectStatusBadge.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjects } from '@/hooks/useRequestProjects.ts'
import type { RequestProject } from '@/types/request-project.ts'

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function RequestsPage() {
  usePageTitle('Mis proyectos')

  const { deletingProjectId, error, isLoading, projects, removeProject } = useRequestProjects()
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<RequestProject | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  useEffect(() => {
    if (!successToast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessToast(null)
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [successToast])

  async function handleConfirmDelete() {
    if (!projectPendingDeletion) {
      return
    }

    const deleted = await removeProject(projectPendingDeletion.id)

    if (!deleted) {
      return
    }

    setSuccessToast('Borrador eliminado correctamente.')
    setProjectPendingDeletion(null)
  }

  return (
    <>
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
        <RequestsEmptyState />
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
              <div key={project.id} className="group relative">
                {project.status === 'draft' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProjectPendingDeletion(project)
                    }}
                    className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/72 text-white opacity-0 transition duration-200 hover:bg-black/86 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label={`Eliminar borrador ${project.title}`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4.5 w-4.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 7h16" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                    </svg>
                  </button>
                ) : null}

                <Link
                  to={`/requests/${project.id}`}
                  className="block overflow-hidden rounded-[0.75rem] border border-white/8 bg-[#1B1B1D] transition hover:border-white/14 hover:bg-[#212124] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
                        <div className="min-w-0 flex-1 font-display text-[1.55rem] font-semibold leading-none tracking-[-0.03em] text-white transition group-hover:text-brand-100">
                          {project.title}
                        </div>

                        <RequestProjectStatusBadge status={project.status} />
                      </div>

                      <p className="text-sm text-brand-100/58">
                        {formatProjectDate(project.updatedAt)}
                      </p>
                    </div>

                    <div className="inline-flex items-center text-sm font-medium text-brand-300 transition">
                      Ver proyecto
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      </div>

      {projectPendingDeletion ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !deletingProjectId) {
              setProjectPendingDeletion(null)
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-draft-project-title"
            aria-describedby="delete-draft-project-description"
            className="w-full max-w-lg rounded-[1rem] border border-white/10 bg-[#1B1B1D] p-5 text-brand-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-400/30 bg-red-500/10 text-red-200"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 7h16" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                    <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                  </svg>
                </div>

                <div className="space-y-3">
                  <h2
                    id="delete-draft-project-title"
                    className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
                  >
                    Eliminar borrador
                  </h2>
                  <p
                    id="delete-draft-project-description"
                    className="text-sm leading-6 text-brand-100/68 sm:text-base"
                  >
                    ¿Seguro que querés eliminar este borrador? Esta acción no se puede
                    deshacer.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProjectPendingDeletion(null)
                }}
                disabled={Boolean(deletingProjectId)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-300 text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setProjectPendingDeletion(null)
                }}
                disabled={Boolean(deletingProjectId)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D] disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmDelete()
                }}
                disabled={Boolean(deletingProjectId)}
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-red-500 px-5 text-sm font-medium text-white transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {deletingProjectId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successToast ? (
        <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
          <div
            role="status"
            aria-live="polite"
            className="rounded-[1rem] border border-emerald-400/30 bg-[#1B1B1D] px-4 py-3 text-sm text-emerald-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          >
            {successToast}
          </div>
        </div>
      ) : null}
    </>
  )
}

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'

import {
  RequestProjectForm,
  type RequestProjectFormValues,
} from '@/components/requests/RequestProjectForm.tsx'
import { RequestProjectsSectionIllustration } from '@/components/requests/RequestProjectsSectionIllustrations.tsx'
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

type ProjectsSectionProps = {
  activeSegment: 'drafts' | 'submitted'
  projects: RequestProject[]
  emptyTitle: string
  emptyDescription: string
  emptyVariant: 'drafts' | 'submitted'
  emptyCtaLabel?: string
  onEmptyCtaClick?: () => void
  onDeleteDraft: (project: RequestProject) => void
}

function ProjectsSection({
  activeSegment,
  projects,
  emptyTitle,
  emptyDescription,
  emptyVariant,
  emptyCtaLabel,
  onEmptyCtaClick,
  onDeleteDraft,
}: ProjectsSectionProps) {
  return (
    <section
      key={activeSegment}
      className="transition-all duration-300 ease-out"
    >
      {projects.length === 0 ? (
        <div className="grid items-center gap-6 p-2 sm:p-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-8">
          <div className="flex justify-center lg:justify-start">
            <RequestProjectsSectionIllustration variant={emptyVariant} />
          </div>
          <div className="text-center lg:text-left">
            <h3 className="text-lg font-semibold text-brand-100">{emptyTitle}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
              {emptyDescription}
            </p>
            {emptyCtaLabel && onEmptyCtaClick ? (
              <button
                type="button"
                onClick={onEmptyCtaClick}
                className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M9 4a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z" />
                </svg>
                {emptyCtaLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((project) => {
            const isDraft = project.status === 'draft'

            return (
              <div key={project.id} className="group relative">
                {isDraft ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteDraft(project)
                    }}
                    className="absolute right-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-black/72 text-white transition duration-200 hover:bg-black/86 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
                  className="block overflow-hidden rounded-[0.75rem] border border-white/8 bg-[#1B1B1D] transition hover:border-white/14 hover:bg-[#212124] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black lg:flex lg:min-h-[16rem]"
                >
                  <div className="relative bg-sand-100 lg:min-h-[16rem] lg:w-1/2 lg:shrink-0">
                    <div className="absolute left-3 top-3 z-10 inline-flex min-h-8 items-center justify-center rounded-full bg-black/55 px-3 text-sm font-medium text-white backdrop-blur-sm">
                      {isDraft ? 'Borrador' : 'Enviada'}
                    </div>

                    {project.locationCount > 1 ? (
                      <div className="absolute bottom-3 left-3 z-10 inline-flex min-h-8 items-center justify-center rounded-full bg-black/55 px-3 text-sm font-medium text-white backdrop-blur-sm">
                        +{project.locationCount - 1}
                      </div>
                    ) : null}

                    {project.firstLocation?.coverImageUrl ? (
                      <div
                        className="aspect-[4/3] w-full bg-cover bg-center lg:h-full lg:min-h-[16rem] lg:aspect-auto"
                        style={{
                          backgroundImage: `url(${project.firstLocation.coverImageUrl})`,
                        }}
                      />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] px-5 text-center text-sm font-medium text-white/88 lg:h-full lg:min-h-[16rem] lg:aspect-auto">
                        Sin locaciones
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5 lg:w-1/2 lg:flex-1 lg:justify-between">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="min-w-0 font-display text-[1.55rem] font-semibold leading-none tracking-[-0.03em] text-white transition group-hover:text-brand-100">
                          {project.title}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex min-h-8 items-center text-sm text-brand-100/62">
                            {isDraft ? 'Editado' : 'Enviado'} {formatProjectDate(project.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center text-sm font-medium text-brand-300 transition">
                      {isDraft ? 'Continuar editando' : 'Ver proyecto'}
                    </div>
                  </div>
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export function RequestsPage() {
  usePageTitle('Mis proyectos')

  const navigate = useNavigate()
  const { createProject, deletingProjectId, error, isCreating, isLoading, projects, removeProject } =
    useRequestProjects()
  const [projectPendingDeletion, setProjectPendingDeletion] = useState<RequestProject | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [activeSegment, setActiveSegment] = useState<'drafts' | 'submitted' | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const draftProjects = projects.filter((project) => project.status === 'draft')
  const sentProjects = projects.filter((project) => project.status !== 'draft')

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

  useEffect(() => {
    if (!isCreateModalOpen) {
      return
    }

    const scrollY = window.scrollY
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyPosition = document.body.style.position
    const previousBodyTop = document.body.style.top
    const previousBodyWidth = document.body.style.width
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isCreating) {
        setIsCreateModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.position = previousBodyPosition
      document.body.style.top = previousBodyTop
      document.body.style.width = previousBodyWidth
      window.removeEventListener('keydown', handleKeyDown)
      window.scrollTo(0, scrollY)
    }
  }, [isCreateModalOpen, isCreating])

  useEffect(() => {
    if (activeSegment) {
      return
    }

    if (draftProjects.length > 0) {
      setActiveSegment('drafts')
      return
    }

    if (sentProjects.length > 0) {
      setActiveSegment('submitted')
      return
    }

    setActiveSegment('drafts')
  }, [activeSegment, draftProjects.length, sentProjects.length])

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

  async function handleCreateProject(values: RequestProjectFormValues) {
    const project = await createProject(values)

    if (!project) {
      return
    }

    setIsCreateModalOpen(false)
    navigate(`/requests/${project.id}`)
  }

  const currentSegment = activeSegment ?? 'drafts'
  const visibleProjects = currentSegment === 'drafts' ? draftProjects : sentProjects
  const currentEmptyTitle =
    currentSegment === 'drafts'
      ? 'No tienes borradores activos.'
      : 'Todavía no enviaste ningún proyecto.'
  const currentEmptyDescription =
    currentSegment === 'drafts'
      ? 'Cuando crees un proyecto nuevo o dejes uno pendiente, aparecerá aquí para que puedas retomarlo.'
      : 'Los proyectos enviados y sus estados aparecerán aquí para que puedas hacer seguimiento de todas tus propuestas.'

  return (
    <>
      <div className="space-y-8 pb-16 pt-8 sm:space-y-10 sm:pb-20 sm:pt-10 lg:space-y-10 lg:pb-24 lg:pt-12">
      {isLoading ? (
        <section className="grid gap-4 lg:grid-cols-2">
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

      {!isLoading && !error ? (
        <section className="w-full max-w-[1720px] space-y-8 sm:space-y-10">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <h1 className="min-w-0 flex-1 font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:flex-none sm:text-5xl">
                Mis proyectos
              </h1>

              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(true)
                }}
                aria-label="Nuevo proyecto"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-sm font-medium text-white transition hover:bg-brand-700 sm:min-h-12 sm:w-auto sm:gap-2 sm:px-5"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="h-4 w-4 fill-current"
                >
                  <path d="M9 4a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4Z" />
                </svg>
                <span className="hidden sm:inline">Nuevo proyecto</span>
              </button>
            </div>

          </div>

          <div className="inline-flex w-full max-w-[34rem] rounded-[1.35rem] border border-white/10 bg-[#171719] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            <button
              type="button"
              onClick={() => {
                setActiveSegment('drafts')
              }}
              aria-pressed={currentSegment === 'drafts'}
              className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-[1rem] px-4 text-sm font-medium transition duration-200 ${
                currentSegment === 'drafts'
                  ? 'bg-brand-300 text-brand-950 shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                  : 'text-brand-100/72 hover:bg-white/6 hover:text-brand-100'
              }`}
            >
              Borradores ({draftProjects.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSegment('submitted')
              }}
              aria-pressed={currentSegment === 'submitted'}
              className={`inline-flex min-h-12 flex-1 items-center justify-center rounded-[1rem] px-4 text-sm font-medium transition duration-200 ${
                currentSegment === 'submitted'
                  ? 'bg-brand-300 text-brand-950 shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                  : 'text-brand-100/72 hover:bg-white/6 hover:text-brand-100'
              }`}
            >
              Enviados ({sentProjects.length})
            </button>
          </div>

          <div className="relative min-h-[20rem]">
            <div
              className="transition-all duration-300 ease-out data-[segment=submitted]:animate-none"
              key={currentSegment}
            >
              <ProjectsSection
                activeSegment={currentSegment}
                projects={visibleProjects}
                emptyTitle={currentEmptyTitle}
                emptyDescription={currentEmptyDescription}
                emptyVariant={currentSegment}
                emptyCtaLabel={currentSegment === 'drafts' ? 'Nuevo proyecto' : undefined}
                onEmptyCtaClick={
                  currentSegment === 'drafts'
                    ? () => {
                        setIsCreateModalOpen(true)
                      }
                    : undefined
                }
                onDeleteDraft={(project) => {
                  setProjectPendingDeletion(project)
                }}
              />
            </div>
          </div>
        </section>
      ) : null}
      </div>

      {isCreateModalOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] bg-black/72 backdrop-blur-sm transition-opacity duration-200"
              onClick={(event) => {
                if (event.target === event.currentTarget && !isCreating) {
                  setIsCreateModalOpen(false)
                }
              }}
              style={{
                paddingTop: 'max(1rem, env(safe-area-inset-top))',
                paddingRight: 'max(1rem, env(safe-area-inset-right))',
                paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              }}
            >
              <div className="flex min-h-full items-center justify-center">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="create-project-modal-title"
                  className="flex w-full max-w-3xl flex-col overflow-y-auto rounded-[1.25rem] border border-white/10 bg-[#1B1B1D] p-5 text-brand-100 shadow-[0_24px_80px_rgba(0,0,0,0.38)] transition-all duration-200 sm:p-6 lg:p-7"
                  style={{
                    maxHeight: 'calc(100vh - 2rem)',
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                  }}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0">
                      <h2
                        id="create-project-modal-title"
                        className="font-display text-3xl font-semibold leading-none tracking-[-0.04em] text-brand-100"
                      >
                        Nuevo proyecto
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateModalOpen(false)
                      }}
                      disabled={isCreating}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 text-brand-100/72 transition hover:bg-white/6 hover:text-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
                      aria-label="Cerrar modal"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M6 6L18 18" />
                        <path d="M18 6L6 18" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-6">
                    <RequestProjectForm
                      error={error}
                      isSubmitting={isCreating}
                      onCancel={() => {
                        setIsCreateModalOpen(false)
                      }}
                      onSubmit={handleCreateProject}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-300 text-brand-950 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-70"
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
                className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-red-500/18 px-5 text-red-100 transition hover:bg-red-500/28 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1B1D] disabled:cursor-not-allowed disabled:opacity-70"
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

import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'

import { RequestProjectFavoritesModal } from '@/components/requests/RequestProjectFavoritesModal.tsx'
import { RequestProjectLocationsList } from '@/components/requests/RequestProjectLocationsList.tsx'
import { RequestProjectStatusBadge } from '@/components/requests/RequestProjectStatusBadge.tsx'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { useRequestProjectDetail } from '@/hooks/useRequestProjectDetail.ts'

type ProjectFormValues = {
  title: string
  message: string
}

function formatProjectDate(value: string) {
  return new Date(value).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function RequestDetailPage() {
  const location = useLocation()
  const { id } = useParams()
  const {
    project,
    locations,
    availableFavorites,
    favoriteCount,
    isLoading,
    isLoadingLocations,
    isSaving,
    isSubmitting,
    isMutatingLocations,
    isLoadingAvailableFavorites,
    removingLocationIds,
    error,
    notFound,
    addLocations,
    loadAvailableFavorites,
    removeLocation,
    saveProject,
    sendProject,
  } = useRequestProjectDetail(id)
  const [values, setValues] = useState<ProjectFormValues>({
    title: '',
    message: '',
  })
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false)

  usePageTitle(project?.title ?? 'Detalle de solicitud')

  useEffect(() => {
    if (!project) {
      return
    }

    setValues({
      title: project.title,
      message: project.message ?? '',
    })
  }, [project])

  useEffect(() => {
    const notice =
      typeof location.state === 'object' &&
      location.state &&
      'notice' in location.state &&
      typeof location.state.notice === 'string'
        ? location.state.notice
        : null

    if (notice) {
      setSuccessMessage(notice)
    }
  }, [location.state])

  if (notFound) {
    return <Navigate replace to="/404" />
  }

  const isDraft = project?.status === 'draft'

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!project || !isDraft) {
      return
    }

    if (!values.title.trim()) {
      setValidationError('Ingresa un titulo para la solicitud.')
      return
    }

    setValidationError(null)
    setSuccessMessage(null)

    const nextProject = await saveProject(values)

    if (nextProject) {
      setSuccessMessage('Los cambios se guardaron correctamente.')
    }
  }

  async function handleSubmitProject() {
    if (!project || !isDraft) {
      return
    }

    if (!values.title.trim()) {
      setValidationError('Ingresa un titulo antes de enviar la solicitud.')
      return
    }

    setValidationError(null)
    setSuccessMessage(null)

    if (values.title !== project.title || values.message !== (project.message ?? '')) {
      const savedProject = await saveProject(values)

      if (!savedProject) {
        return
      }
    }

    const submittedProject = await sendProject()

    if (submittedProject) {
      setSuccessMessage('Tu solicitud fue enviada correctamente.')
    }
  }

  async function handleOpenFavoritesModal() {
    setSuccessMessage(null)
    await loadAvailableFavorites()
    setIsFavoritesModalOpen(true)
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-black px-4 py-10 sm:px-6 sm:py-12 lg:px-10 lg:py-14 2xl:px-14">
      <div className="mx-auto max-w-[1720px]">
        <section className="mx-auto max-w-5xl">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-8 animate-pulse rounded bg-sand-200" />
              <div className="h-28 animate-pulse rounded-[1.5rem] bg-sand-200" />
              <div className="h-28 animate-pulse rounded-[1.5rem] bg-sand-200" />
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && project ? (
            <div className="space-y-7">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {isDraft ? (
                      <input
                        type="text"
                        value={values.title}
                        onChange={(event) => {
                          setValues((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                          setValidationError(null)
                        }}
                        className="min-w-[14rem] flex-1 bg-transparent font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 outline-none placeholder:text-brand-100/38 sm:text-5xl"
                        placeholder="Titulo de la solicitud"
                        disabled={isSaving || isSubmitting}
                      />
                    ) : (
                      <h1 className="font-display text-4xl font-semibold leading-none tracking-[-0.04em] text-brand-100 sm:text-5xl">
                        {project.title}
                      </h1>
                    )}

                    <RequestProjectStatusBadge status={project.status} />
                  </div>

                  <p className="text-sm leading-6 text-brand-100/62 sm:text-base">
                    Creada el {formatProjectDate(project.createdAt)}
                  </p>
                </div>

                <Link
                  to="/requests"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 px-4 text-sm font-medium text-brand-100 transition hover:bg-white/6"
                >
                  Volver
                </Link>
              </div>

              {successMessage ? (
                <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  {successMessage}
                </div>
              ) : null}

              {validationError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  {validationError}
                </div>
              ) : null}

              <form className="space-y-6" onSubmit={handleSave}>
                <section className="space-y-1.5">
                  <h2 className="text-base font-semibold text-brand-100 sm:text-lg">
                    Mensaje
                  </h2>
                  {isDraft ? (
                    <textarea
                      value={values.message}
                      onChange={(event) => {
                        setValues((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }}
                      rows={4}
                      className="w-full resize-none bg-transparent p-0 text-sm leading-7 text-brand-100/72 outline-none placeholder:text-brand-100/38 sm:text-base"
                      placeholder="Describe tu proyecto, referencias y necesidades generales."
                      disabled={isSaving || isSubmitting}
                    />
                  ) : (
                    <p className="whitespace-pre-line text-sm leading-7 text-brand-100/72 sm:text-base">
                      {project.message?.trim() || 'Sin mensaje.'}
                    </p>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <h2 className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-100 sm:text-4xl">
                      Locaciones seleccionadas
                    </h2>

                    {isDraft ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handleOpenFavoritesModal()
                        }}
                        disabled={isMutatingLocations || isLoadingAvailableFavorites}
                        className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isLoadingAvailableFavorites
                          ? 'Cargando favoritos...'
                          : 'Agregar desde favoritos'}
                      </button>
                    ) : null}
                  </div>

                  <RequestProjectLocationsList
                    locations={locations}
                    isLoading={isLoadingLocations}
                    canRemove={isDraft}
                    removingLocationIds={removingLocationIds}
                    onRemove={(locationId) => {
                      if (isMutatingLocations) {
                        return
                      }

                      void removeLocation(locationId)
                    }}
                  />
                </section>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  {isDraft ? (
                    <>
                      <button
                        type="submit"
                        disabled={isSaving || isSubmitting}
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 px-5 text-sm font-medium text-brand-100 transition hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSaving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSubmitProject()
                        }}
                        disabled={isSaving || isSubmitting}
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? 'Enviando solicitud...' : 'Enviar solicitud'}
                      </button>
                    </>
                  ) : null}
                </div>
              </form>
            </div>
          ) : null}
        </section>
      </div>
      <RequestProjectFavoritesModal
        favorites={availableFavorites}
        favoriteCount={favoriteCount}
        isLoading={isLoadingAvailableFavorites}
        isOpen={isFavoritesModalOpen}
        isSubmitting={isMutatingLocations}
        onClose={() => {
          if (isMutatingLocations) {
            return
          }

          setIsFavoritesModalOpen(false)
        }}
        onSubmit={async (locationIds) => {
          const addedCount = await addLocations(locationIds)

          if (addedCount > 0) {
            setSuccessMessage(
              `${addedCount} locacion${addedCount === 1 ? '' : 'es'} agregada${addedCount === 1 ? '' : 's'} al proyecto.`,
            )
          }

          setIsFavoritesModalOpen(false)
        }}
      />
    </div>
  )
}

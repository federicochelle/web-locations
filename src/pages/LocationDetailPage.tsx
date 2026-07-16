import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { AuthRequiredModal } from '@/components/auth/AuthRequiredModal.tsx'
import { RequestProjectPickerModal } from '@/components/requests/RequestProjectPickerModal.tsx'
import { FavoriteButton } from '@/components/ui/FavoriteButton.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useFavorites } from '@/hooks/useFavorites.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocationByLocationCode } from '@/services/locations.service.ts'
import {
  addLocationToRequestProject,
  createRequestProject,
  getMyDraftRequestProjects,
  getRequestProjectErrorMessage,
} from '@/services/request-projects.service.ts'
import type { PublicLocationDetail } from '@/types/location.ts'
import type { RequestProject } from '@/types/request-project.ts'
import { buildPublicLocationPath, normalizePublicValue } from '@/utils/location-public.ts'

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

const MAX_SELECTED_IMAGES = 30

export function LocationDetailPage() {
  const locationState = useLocation()
  const navigate = useNavigate()
  const {
    slug: legacySlug,
    categorySlug: routeCategorySlug,
    locationCode: routeLocationCode,
  } = useParams()
  const [location, setLocation] = useState<PublicLocationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [requestNotice, setRequestNotice] = useState<string | null>(null)
  const [requestActionError, setRequestActionError] = useState<string | null>(null)
  const [isLoadingDraftProjects, setIsLoadingDraftProjects] = useState(false)
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [isAddingLocationToProject, setIsAddingLocationToProject] = useState(false)
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false)
  const [isAuthRequiredModalOpen, setIsAuthRequiredModalOpen] = useState(false)
  const [selectionLimitMessage, setSelectionLimitMessage] = useState<string | null>(null)
  const [draftProjects, setDraftProjects] = useState<RequestProject[]>([])
  const requestButtonRef = useRef<HTMLButtonElement | null>(null)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { favoriteIds, pendingIds, toggleFavorite } = useFavorites()
  const { images, addImage, removeImage, isSelected } = useImageSelection()

  usePageTitle(location?.locationCode ?? 'Detalle de locacion')

  useEffect(() => {
    let isMounted = true

    async function loadLocation() {
      const locationIdentifier = routeLocationCode ?? legacySlug ?? null

      if (!locationIdentifier) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setNotFound(false)

        const nextLocation = await getLocationByLocationCode(locationIdentifier)

        if (!isMounted) {
          return
        }

        if (!nextLocation) {
          setNotFound(true)
          setLocation(null)
          return
        }

        const canonicalPath = buildPublicLocationPath({
          categorySlug: nextLocation.categorySlug,
          locationCode: nextLocation.locationCode,
          fallbackSlug: nextLocation.slug,
        })
        const hasLegacyRoute = Boolean(legacySlug)
        const hasInvalidCategorySlug = Boolean(
          routeCategorySlug && routeCategorySlug !== nextLocation.categorySlug,
        )
        const hasNonCanonicalLocationCode = Boolean(
          routeLocationCode &&
          normalizePublicValue(routeLocationCode) !==
            normalizePublicValue(nextLocation.locationCode),
        )

        if (
          hasLegacyRoute ||
          hasInvalidCategorySlug ||
          hasNonCanonicalLocationCode ||
          locationState.pathname !== canonicalPath
        ) {
          navigate(canonicalPath, { replace: true })
          return
        }

        setLocation(nextLocation)
      } catch (loadError) {
        if (!isMounted) {
          return
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No se pudo cargar la locacion.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLocation()

    return () => {
      isMounted = false
    }
  }, [legacySlug, locationState.pathname, navigate, routeCategorySlug, routeLocationCode])

  useEffect(() => {
    if (!isProjectPickerOpen) {
      return
    }

    setRequestNotice(null)
  }, [isProjectPickerOpen])

  useEffect(() => {
    if (images.length < MAX_SELECTED_IMAGES && selectionLimitMessage) {
      setSelectionLimitMessage(null)
    }
  }, [images.length, selectionLimitMessage])

  function handleRequestIntent() {
    if (
      !location ||
      authLoading ||
      isLoadingDraftProjects ||
      isCreatingProject ||
      isAddingLocationToProject
    ) {
      return
    }

    if (!isAuthenticated) {
      setIsAuthRequiredModalOpen(true)
      return
    }

    void handleOpenProjectPicker()
  }

  async function handleOpenProjectPicker() {
    if (!location) {
      return
    }

    try {
      setIsLoadingDraftProjects(true)
      setRequestActionError(null)
      setRequestNotice(null)

      const drafts = await getMyDraftRequestProjects()
      setDraftProjects(drafts)
      setIsProjectPickerOpen(true)
    } catch (requestProjectError) {
      setRequestActionError(getRequestProjectErrorMessage(requestProjectError))
      setDraftProjects([])
      setIsProjectPickerOpen(true)
    } finally {
      setIsLoadingDraftProjects(false)
    }
  }

  async function handleAddToProject(projectId: string) {
    if (!location) {
      return
    }

    try {
      setIsAddingLocationToProject(true)
      setRequestActionError(null)
      setRequestNotice(null)

      const result = await addLocationToRequestProject(projectId, location.id)

      setRequestNotice(
        result === 'exists'
          ? 'Esta locacion ya está en el proyecto.'
          : 'Locacion agregada al proyecto.',
      )

      const drafts = await getMyDraftRequestProjects()
      setDraftProjects(drafts)
    } catch (requestProjectError) {
      setRequestActionError(getRequestProjectErrorMessage(requestProjectError))
    } finally {
      setIsAddingLocationToProject(false)
    }
  }

  async function handleCreateProject(projectTitle: string) {
    if (!location) {
      return
    }

    try {
      setIsCreatingProject(true)
      setRequestActionError(null)
      setRequestNotice(null)

      const project = await createRequestProject({
        title: projectTitle,
        message: null,
      })

      const result = await addLocationToRequestProject(project.id, location.id)
      const drafts = await getMyDraftRequestProjects()

      setDraftProjects(drafts)
      setRequestNotice(
        result === 'exists'
          ? 'Esta locacion ya está en el proyecto.'
          : 'Locacion agregada al proyecto.',
      )
    } catch (requestProjectError) {
      setRequestActionError(getRequestProjectErrorMessage(requestProjectError))
    } finally {
      setIsCreatingProject(false)
    }
  }

  function handleImageSelection(
    event: MouseEvent<HTMLButtonElement>,
    image: PublicLocationDetail['images'][number],
  ) {
    event.stopPropagation()

    if (!location) {
      return
    }

    const key = `${location.id}:${image.url}`

    if (isSelected(key)) {
      removeImage(key)
      setSelectionLimitMessage(null)
      return
    }

    if (images.length >= MAX_SELECTED_IMAGES) {
      setSelectionLimitMessage('Llegaste al maximo de 30 imagenes.')
      return
    }

    addImage({
      key,
      imageUrl: image.url,
      sortOrder: image.sortOrder,
      locationId: location.id,
      locationCode: location.locationCode,
      locationTitle: location.title,
      categorySlug: location.categorySlug,
      selectedAt: new Date().toISOString(),
    })
    setSelectionLimitMessage(null)
  }

  if (notFound) {
    return <Navigate replace to="/404" />
  }

  return (
    <div className="space-y-6 pb-16 pt-8 sm:space-y-8 sm:pb-20 sm:pt-10 lg:space-y-10 lg:pb-24 lg:pt-12">
      {isLoading ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto grid max-w-[1720px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="aspect-[16/13] animate-pulse rounded-[1.75rem] bg-sand-200 lg:aspect-[16/12]"
              />
            ))}
          </div>
        </section>
      ) : null}

      {!isLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="text-lg font-semibold">No se pudo cargar la locacion</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && location ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto space-y-4 max-w-[1720px]">
            <div className="flex items-center justify-between gap-4">
              <p className="px-1 font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-300 sm:text-4xl">
                {formatLocationCode(location.locationCode)}
              </p>
              <div className="flex items-center gap-3">
                <button
                  ref={requestButtonRef}
                  type="button"
                  onClick={handleRequestIntent}
                  disabled={
                    authLoading ||
                    isLoadingDraftProjects ||
                    isCreatingProject ||
                    isAddingLocationToProject
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isLoadingDraftProjects ? 'Cargando proyectos...' : 'Agregar a proyecto'}
                </button>
                <FavoriteButton
                  active={favoriteIds.has(location.id)}
                  loading={pendingIds.includes(location.id)}
                  onClick={() => {
                    void toggleFavorite({ id: location.id })
                  }}
                />
              </div>
            </div>
            <div aria-live="polite" className="min-h-6 px-1">
              {selectionLimitMessage ? (
                <p className="text-sm font-medium text-brand-700">
                  {selectionLimitMessage}
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {location.images.length > 0 ? (
                location.images.map((image, index) => {
                  const imageSelectionKey = `${location.id}:${image.url}`
                  const imageIsSelected = isSelected(imageSelectionKey)

                  return (
                    <div
                      key={`${image.url}-${index}`}
                      className="group relative overflow-hidden rounded-[1.75rem]"
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 z-0 rounded-[1.75rem] transition ${
                          imageIsSelected
                            ? 'bg-brand-950/14 ring-2 ring-brand-300 ring-inset'
                            : 'bg-black/0 md:group-hover:bg-black/18'
                        }`}
                      />
                      <div className="absolute left-3 top-3 z-10">
                        <button
                          type="button"
                          aria-pressed={imageIsSelected}
                          aria-label={
                            imageIsSelected
                              ? `Quitar imagen ${index + 1} de la seleccion`
                              : `Seleccionar imagen ${index + 1}`
                          }
                          onClick={(event) => {
                            handleImageSelection(event, image)
                          }}
                          className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#14110f] ${
                            imageIsSelected
                              ? 'border-brand-300 bg-brand-300 text-brand-950'
                              : 'border-white/15 bg-black/60 text-white hover:bg-black/76 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
                          }`}
                        >
                          <span aria-hidden="true" className="mr-2 text-base leading-none">
                            {imageIsSelected ? '✓' : '+'}
                          </span>
                          <span>
                            {imageIsSelected ? 'Seleccionada' : 'Seleccionar'}
                          </span>
                        </button>
                      </div>
                      <div
                        className="aspect-[16/13] bg-cover bg-center lg:aspect-[16/12]"
                        style={{ backgroundImage: `url(${image.url})` }}
                      />
                    </div>
                  )
                })
              ) : (
                <div className="aspect-[16/13] rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] lg:aspect-[16/12]" />
              )}
            </div>
          </div>
        </section>
      ) : null}
      <RequestProjectPickerModal
        isOpen={isProjectPickerOpen}
        isLoadingProjects={isLoadingDraftProjects}
        isCreatingProject={isCreatingProject}
        isAddingLocation={isAddingLocationToProject}
        projects={draftProjects}
        error={requestActionError}
        successMessage={requestNotice}
        onClose={() => {
          if (
            isLoadingDraftProjects ||
            isCreatingProject ||
            isAddingLocationToProject
          ) {
            return
          }

          setIsProjectPickerOpen(false)
          requestButtonRef.current?.focus()
        }}
        onAddToProject={handleAddToProject}
        onCreateProject={handleCreateProject}
        onViewProject={(projectId) => {
          navigate(`/requests/${projectId}`)
        }}
      />
      <AuthRequiredModal
        isOpen={isAuthRequiredModalOpen}
        onClose={() => {
          setIsAuthRequiredModalOpen(false)
          requestButtonRef.current?.focus()
        }}
        loginState={{
          from: locationState,
          authIntent: 'request-info',
        }}
        registerState={{
          from: locationState,
          authIntent: 'request-info',
        }}
      />
    </div>
  )
}

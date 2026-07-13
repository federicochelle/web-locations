import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { AuthRequiredModal } from '@/components/auth/AuthRequiredModal.tsx'
import { RequestProjectPickerModal } from '@/components/requests/RequestProjectPickerModal.tsx'
import { FavoriteButton } from '@/components/ui/FavoriteButton.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useFavorites } from '@/hooks/useFavorites.ts'
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

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function LocationDetailPage() {
  const locationState = useLocation()
  const navigate = useNavigate()
  const { slug: publicSlug } = useParams()
  const [location, setLocation] = useState<PublicLocationDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [requestNotice, setRequestNotice] = useState<string | null>(null)
  const [requestActionError, setRequestActionError] = useState<string | null>(null)
  const [isRequestActionLoading, setIsRequestActionLoading] = useState(false)
  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false)
  const [isAuthRequiredModalOpen, setIsAuthRequiredModalOpen] = useState(false)
  const [draftProjects, setDraftProjects] = useState<RequestProject[]>([])
  const requestButtonRef = useRef<HTMLButtonElement | null>(null)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { favoriteIds, pendingIds, toggleFavorite } = useFavorites()

  usePageTitle(location?.locationCode ?? 'Detalle de locacion')

  useEffect(() => {
    let isMounted = true

    async function loadLocation() {
      if (!publicSlug) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setNotFound(false)

        const nextLocation = await getLocationByLocationCode(publicSlug)

        if (!isMounted) {
          return
        }

        if (!nextLocation) {
          setNotFound(true)
          setLocation(null)
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
  }, [publicSlug])

  function handleRequestIntent() {
    if (!location || authLoading || isRequestActionLoading) {
      return
    }

    if (!isAuthenticated) {
      setIsAuthRequiredModalOpen(true)
      return
    }

    void handleRequestProjectFlow()
  }

  async function handleRequestProjectFlow() {
    if (!location) {
      return
    }

    try {
      setIsRequestActionLoading(true)
      setRequestActionError(null)
      setRequestNotice(null)

      const drafts = await getMyDraftRequestProjects()

      if (drafts.length === 0) {
        const project = await createRequestProject({
          title: 'Nueva solicitud',
          message: null,
        })

        await addLocationToRequestProject(project.id, location.id)

        navigate(`/requests/${project.id}`, {
          state: {
            notice: 'Creamos una nueva solicitud con esta locacion.',
          },
        })
        return
      }

      if (drafts.length === 1) {
        const result = await addLocationToRequestProject(drafts[0].id, location.id)

        navigate(`/requests/${drafts[0].id}`, {
          state: {
            notice:
              result === 'exists'
                ? 'Esta locacion ya forma parte de la solicitud.'
                : 'La locacion fue agregada correctamente a tu solicitud.',
          },
        })
        return
      }

      setDraftProjects(drafts)
      setIsProjectPickerOpen(true)
    } catch (requestProjectError) {
      setRequestActionError(getRequestProjectErrorMessage(requestProjectError))
    } finally {
      setIsRequestActionLoading(false)
    }
  }

  async function handleSelectDraftProject(projectId: string) {
    if (!location) {
      return
    }

    try {
      setIsRequestActionLoading(true)
      setRequestActionError(null)
      setRequestNotice(null)

      const result = await addLocationToRequestProject(projectId, location.id)

      setIsProjectPickerOpen(false)
      navigate(`/requests/${projectId}`, {
        state: {
          notice:
            result === 'exists'
              ? 'Esta locacion ya forma parte de la solicitud.'
              : 'La locacion fue agregada correctamente a tu solicitud.',
        },
      })
    } catch (requestProjectError) {
      setRequestActionError(getRequestProjectErrorMessage(requestProjectError))
    } finally {
      setIsRequestActionLoading(false)
    }
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
                  disabled={authLoading || isRequestActionLoading}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-500 px-5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRequestActionLoading ? 'Preparando solicitud...' : 'Solicitar informacion'}
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
            {requestNotice ? (
              <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                {requestNotice}
              </div>
            ) : null}
            {requestActionError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {requestActionError}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {location.images.length > 0 ? (
                location.images.map((image, index) => (
                  <div
                    key={`${image.url}-${index}`}
                    className="overflow-hidden rounded-[1.75rem]"
                  >
                    <div
                      className="aspect-[16/13] bg-cover bg-center lg:aspect-[16/12]"
                      style={{ backgroundImage: `url(${image.url})` }}
                    />
                  </div>
                ))
              ) : (
                <div className="aspect-[16/13] rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] lg:aspect-[16/12]" />
              )}
            </div>
          </div>
        </section>
      ) : null}
      <RequestProjectPickerModal
        isOpen={isProjectPickerOpen}
        isSubmitting={isRequestActionLoading}
        projects={draftProjects}
        onClose={() => {
          if (isRequestActionLoading) {
            return
          }

          setIsProjectPickerOpen(false)
        }}
        onSelect={handleSelectDraftProject}
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

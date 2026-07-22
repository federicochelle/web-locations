import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { AuthRequiredModal } from '@/components/auth/AuthRequiredModal.tsx'
import { ImageLightbox } from '@/components/ui/ImageLightbox.tsx'
import { LocationApproxMap } from '@/features/locations/components/LocationApproxMap.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useFavorites } from '@/hooks/useFavorites.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { usePageTitle } from '@/hooks/usePageTitle.ts'
import { getLocationByLocationCode } from '@/services/locations.service.ts'
import type { PublicLocationDetail } from '@/types/location.ts'
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
  const [isAuthRequiredModalOpen, setIsAuthRequiredModalOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [selectionLimitMessage, setSelectionLimitMessage] = useState<string | null>(null)
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
    if (images.length < MAX_SELECTED_IMAGES && selectionLimitMessage) {
      setSelectionLimitMessage(null)
    }
  }, [images.length, selectionLimitMessage])

  function handleFavoriteIntent() {
    if (!location || authLoading) {
      return
    }

    if (!isAuthenticated) {
      setIsAuthRequiredModalOpen(true)
      return
    }

    void toggleFavorite({ id: location.id })
  }

  function toggleImageSelection(image: PublicLocationDetail['images'][number]) {
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
      locationImageId: image.id,
      sortOrder: image.sortOrder,
      locationId: location.id,
      locationCode: location.locationCode,
      locationTitle: location.title,
      categorySlug: location.categorySlug,
      selectedAt: new Date().toISOString(),
    })
    setSelectionLimitMessage(null)
  }

  function handleImageSelection(
    event: MouseEvent<HTMLButtonElement>,
    image: PublicLocationDetail['images'][number],
  ) {
    event.stopPropagation()
    toggleImageSelection(image)
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
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
              <div className="min-w-0 flex-1 px-1">
                <div className="flex items-center gap-3">
                  <p className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-300 sm:text-4xl">
                    {formatLocationCode(location.locationCode)}
                  </p>
                  <button
                    type="button"
                    onClick={handleFavoriteIntent}
                    disabled={authLoading || pendingIds.includes(location.id)}
                    aria-label={
                      pendingIds.includes(location.id)
                        ? 'Guardando favorito'
                        : favoriteIds.has(location.id)
                          ? 'Quitar de favoritos'
                          : 'Agregar a favoritos'
                    }
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-70 sm:h-10 sm:w-10 ${
                      favoriteIds.has(location.id)
                        ? 'border border-white/12 bg-white text-brand-950 hover:bg-brand-100'
                        : 'bg-brand-500 text-white hover:bg-brand-700'
                    }`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5.5 w-5.5"
                      fill={favoriteIds.has(location.id) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20.5c-.3 0-.6-.1-.8-.3C7 16.6 4 13.8 4 10.3 4 7.9 5.9 6 8.3 6c1.5 0 2.9.7 3.7 1.9C12.8 6.7 14.2 6 15.7 6 18.1 6 20 7.9 20 10.3c0 3.5-3 6.3-7.2 9.9-.2.2-.5.3-.8.3Z" />
                    </svg>
                  </button>
                </div>
                {location.description ? (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-100/78 sm:text-base">
                    {location.description}
                  </p>
                ) : null}
              </div>
              {location.approxLat !== null && location.approxLng !== null ? (
                <div className="w-full lg:w-[28rem] lg:flex-none">
                  <LocationApproxMap
                    approxLat={location.approxLat}
                    approxLng={location.approxLng}
                    approxRadius={location.approxRadius}
                  />
                </div>
              ) : null}
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
                    <button
                      type="button"
                      key={`${image.url}-${index}`}
                      onClick={() => {
                        setLightboxIndex(index)
                        setIsLightboxOpen(true)
                      }}
                      className="group relative overflow-hidden rounded-[1.75rem]"
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 z-0 rounded-[1.75rem] transition ${
                          imageIsSelected
                            ? 'bg-brand-950/14 ring-2 ring-brand-300 ring-inset'
                            : 'bg-black/0 md:group-hover:bg-black/18'
                        }`}
                      />
                      <div className="absolute right-3 top-3 z-10">
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
                    </button>
                  )
                })
              ) : (
                <div className="aspect-[16/13] rounded-[1.75rem] bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] lg:aspect-[16/12]" />
              )}
            </div>
          </div>
        </section>
      ) : null}
      <ImageLightbox
        images={
          location?.images.map((image, index) => ({
            id: image.id,
            url: image.url,
            alt: `${formatLocationCode(location.locationCode)} · imagen ${index + 1}`,
            isSelected: isSelected(`${location.id}:${image.url}`),
          })) ?? []
        }
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onToggleSelect={(lightboxImage) => {
          const sourceImage = location?.images.find((image) => image.id === lightboxImage.id)

          if (!sourceImage) {
            return
          }

          toggleImageSelection(sourceImage)
        }}
        onClose={() => {
          setIsLightboxOpen(false)
        }}
      />
      <AuthRequiredModal
        isOpen={isAuthRequiredModalOpen}
        onClose={() => {
          setIsAuthRequiredModalOpen(false)
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

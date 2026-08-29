import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'

import { AuthRequiredModal } from '@/components/auth/AuthRequiredModal.tsx'
import { ImageLightbox } from '@/components/ui/ImageLightbox.tsx'
import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useFavorites } from '@/hooks/useFavorites.ts'
import { useImageSelection } from '@/hooks/useImageSelection.ts'
import { usePageSeo } from '@/hooks/usePageSeo.ts'
import { getLocationByLocationCode } from '@/services/locations.service.ts'
import type { PublicLocationDetail } from '@/types/location.ts'
import { getCloudflareCardImageUrl } from '@/utils/cloudflare-images.ts'
import { getImageSelectionKey } from '@/utils/image-selection-key.ts'
import { buildPublicLocationPath, normalizePublicValue } from '@/utils/location-public.ts'

const CRITICAL_IMAGE_TIMEOUT_MS = 2000

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

function getCriticalImageCount(totalImages: number) {
  const maxCriticalImages =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
      ? 2
      : 4

  return Math.min(totalImages, maxCriticalImages)
}

function buildLocationImageAlt(location: PublicLocationDetail, index: number) {
  const locationCode = formatLocationCode(location.locationCode)
  const locationContext = [location.departmentName, location.zoneName]
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && !value.startsWith('Sin '))
    .join(' · ')

  return locationContext
    ? `${locationCode} · ${locationContext} · imagen ${index + 1}`
    : `${locationCode} · imagen ${index + 1}`
}

const MAX_SELECTED_IMAGES = 80
const LocationApproxMap = lazy(async () => {
  const module = await import('@/features/locations/components/LocationApproxMap.tsx')

  return {
    default: module.LocationApproxMap,
  }
})

type InlineGalleryImageProps = {
  index: number
  imageUrl: string
  alt: string
  loading: 'eager' | 'lazy'
  fetchPriority: 'high' | 'auto'
  canReveal: boolean
  onSettled: (index: number) => void
}

function InlineGalleryImage({
  index,
  imageUrl,
  alt,
  loading,
  fetchPriority,
  canReveal,
  onSettled,
}: InlineGalleryImageProps) {
  const optimizedImageUrl = getCloudflareCardImageUrl(imageUrl)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const hasReportedSettlementRef = useRef(false)

  useEffect(() => {
    setIsImageLoaded(false)
    setHasImageError(false)
    hasReportedSettlementRef.current = false
  }, [optimizedImageUrl])

  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
      setIsImageLoaded(true)
      reportSettledOnce()
    }
  }, [optimizedImageUrl])

  useEffect(() => {
    if (!optimizedImageUrl) {
      reportSettledOnce()
    }
  }, [optimizedImageUrl])

  function reportSettledOnce() {
    if (hasReportedSettlementRef.current) {
      return
    }

    hasReportedSettlementRef.current = true
    onSettled(index)
  }

  return (
    <div
      className={`aspect-[16/13] bg-brand-950 transition-opacity duration-200 ease-out lg:aspect-[16/12] ${
        canReveal ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {optimizedImageUrl && !hasImageError ? (
        <img
          ref={imageRef}
          src={optimizedImageUrl}
          alt={alt}
          loading={loading}
          fetchPriority={fetchPriority}
          decoding="async"
          onLoad={(event) => {
            if (event.currentTarget.complete) {
              setIsImageLoaded(true)
              reportSettledOnce()
            }
          }}
          onError={() => {
            setHasImageError(true)
            setIsImageLoaded(false)
            reportSettledOnce()
          }}
          className={`h-full w-full object-cover transition duration-200 ease-out ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}
    </div>
  )
}

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
  const [settledInlineImageIndexes, setSettledInlineImageIndexes] = useState<Set<number>>(
    () => new Set(),
  )
  const [isWaitingForCriticalImages, setIsWaitingForCriticalImages] = useState(false)
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { favoriteIds, pendingIds, toggleFavorite } = useFavorites()
  const { activeProjectId, images, addImage, removeImage, isSelected } = useImageSelection()
  const criticalInlineImageCount = getCriticalImageCount(location?.images.length ?? 0)
  let lastRevealableImageIndex = -1

  while (settledInlineImageIndexes.has(lastRevealableImageIndex + 1)) {
    lastRevealableImageIndex += 1
  }

  const locationDescription =
    location?.description?.trim() ||
    (location
      ? `Explorá la locación ${formatLocationCode(location.locationCode)} en Film Locations Uruguay.`
      : 'Explorá una locación publicada en Film Locations Uruguay.')
  const canonicalPath = location
    ? buildPublicLocationPath({
        categorySlug: location.categorySlug,
        locationCode: location.locationCode,
        fallbackSlug: location.slug,
      })
    : routeCategorySlug && routeLocationCode
    ? `/categorias/${routeCategorySlug}/${routeLocationCode}`
    : null

  usePageSeo({
    title: location?.locationCode ?? 'Detalle de locación',
    description: locationDescription,
    canonicalPath,
    ogImagePath: location?.images[0]?.url ?? undefined,
  })

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

        const resolvedCanonicalPath = buildPublicLocationPath({
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
          locationState.pathname !== resolvedCanonicalPath
        ) {
          navigate(resolvedCanonicalPath, { replace: true })
          return
        }

        setSettledInlineImageIndexes(new Set())
        setLocation(nextLocation)
        setIsWaitingForCriticalImages(getCriticalImageCount(nextLocation.images.length) > 0)
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

  useEffect(() => {
    if (
      isLoading ||
      error ||
      notFound ||
      !location ||
      location.images.length === 0 ||
      criticalInlineImageCount === 0
    ) {
      setIsWaitingForCriticalImages(false)
      return
    }

    let resolvedCriticalImagesCount = 0

    for (let index = 0; index < criticalInlineImageCount; index += 1) {
      if (settledInlineImageIndexes.has(index)) {
        resolvedCriticalImagesCount += 1
      }
    }

    if (resolvedCriticalImagesCount >= criticalInlineImageCount) {
      setIsWaitingForCriticalImages(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsWaitingForCriticalImages(false)
    }, CRITICAL_IMAGE_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [
    criticalInlineImageCount,
    error,
    isLoading,
    location,
    notFound,
    settledInlineImageIndexes,
  ])

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

    const key = getImageSelectionKey({
      locationId: location.id,
      locationImageId: image.id,
      imageUrl: image.url,
    })

    if (isSelected(key)) {
      removeImage(key)
      setSelectionLimitMessage(null)
      return
    }

    if (images.length >= MAX_SELECTED_IMAGES) {
      setSelectionLimitMessage('Llegaste al maximo de 80 imagenes.')
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

  const isPageLoading = isLoading || isWaitingForCriticalImages

  return (
    <div className="space-y-6 pb-16 pt-8 sm:space-y-8 sm:pb-20 sm:pt-10 lg:space-y-10 lg:pb-24 lg:pt-12">
      {isPageLoading ? (
        <section className="relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14">
          <div className="mx-auto max-w-[1720px]">
            <AppLoading label="Cargando locación..." className="min-h-[46vh]" />
          </div>
        </section>
      ) : null}

      {!isPageLoading && error ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="text-lg font-semibold">No se pudo cargar la locacion</h2>
          <p className="mt-2 text-sm">{error}</p>
        </section>
      ) : null}

      {!isLoading && !error && location ? (
        <section
          className={`relative left-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-10 2xl:px-14 ${
            isWaitingForCriticalImages
              ? 'pointer-events-none invisible max-h-0 overflow-hidden'
              : ''
          }`}
          aria-hidden={isWaitingForCriticalImages}
        >
          <div className="mx-auto space-y-4 max-w-[1720px]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
              <div className="min-w-0 flex-1 px-1">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-brand-300 sm:text-4xl">
                      {formatLocationCode(location.locationCode)}
                    </h1>
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
                  <p className="max-w-2xl text-sm leading-6 text-brand-100/68 sm:text-base">
                    Seleccioná las imágenes que mejor representen lo que buscás y agregá esta locación a tu proyecto.
                  </p>
                </div>
              </div>
              {location.approxLat !== null && location.approxLng !== null ? (
                <div className="w-full lg:w-[28rem] lg:flex-none">
                  <Suspense
                    fallback={
                      <AppLoading
                        compact
                        label="Cargando mapa..."
                        className="h-[17rem]"
                      />
                    }
                  >
                    <LocationApproxMap
                      approxLat={location.approxLat}
                      approxLng={location.approxLng}
                      approxRadius={location.approxRadius}
                    />
                  </Suspense>
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
                  const imageSelectionKey = getImageSelectionKey({
                    locationId: location.id,
                    locationImageId: image.id,
                    imageUrl: image.url,
                  })
                  const imageIsSelected = isSelected(imageSelectionKey)

                  return (
                    <button
                      type="button"
                      key={`${image.url}-${index}`}
                      onClick={() => {
                        setLightboxIndex(index)
                        setIsLightboxOpen(true)
                      }}
                      className="group relative overflow-hidden rounded-[0.3rem]"
                    >
                      <div
                        className={`pointer-events-none absolute inset-0 z-0 rounded-[0.3rem] transition ${
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
                      <InlineGalleryImage
                        index={index}
                        imageUrl={image.url}
                        alt={buildLocationImageAlt(location, index)}
                        loading={index < criticalInlineImageCount ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        canReveal={index <= lastRevealableImageIndex}
                        onSettled={(settledIndex) => {
                          setSettledInlineImageIndexes((currentIndexes) => {
                            if (currentIndexes.has(settledIndex)) {
                              return currentIndexes
                            }

                            const nextIndexes = new Set(currentIndexes)
                            nextIndexes.add(settledIndex)
                            return nextIndexes
                          })
                        }}
                      />
                    </button>
                  )
                })
              ) : (
                <div className="aspect-[16/13] rounded-[0.3rem] bg-[linear-gradient(135deg,rgba(124,91,66,0.55),rgba(32,23,18,0.92))] lg:aspect-[16/12]" />
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
            alt: buildLocationImageAlt(location, index),
            isSelected: isSelected(
              getImageSelectionKey({
                locationId: location.id,
                locationImageId: image.id,
                imageUrl: image.url,
              }),
            ),
          })) ?? []
        }
        initialIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        imageClassName="rounded-[0.3rem]"
        onToggleSelect={(lightboxImage) => {
          const sourceImage = location?.images.find((image) => image.id === lightboxImage.id)

          if (!sourceImage || !location) {
            return
          }

          const selectionKey = getImageSelectionKey({
            locationId: location.id,
            locationImageId: sourceImage.id,
            imageUrl: sourceImage.url,
          })
          const willOpenPendingSelectionDrawer =
            activeProjectId === null &&
            !isSelected(selectionKey) &&
            images.length < MAX_SELECTED_IMAGES

          toggleImageSelection(sourceImage)

          if (willOpenPendingSelectionDrawer) {
            setIsLightboxOpen(false)
            setLightboxIndex(0)
          }
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

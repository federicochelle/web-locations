import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { AuthRequiredModal } from '@/components/auth/AuthRequiredModal.tsx'
import { FavoriteButton } from '@/components/ui/FavoriteButton.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import type { PublicLocationCard } from '@/types/location.ts'
import { getCloudflareCardImageUrl } from '@/utils/cloudflare-images.ts'
import { buildPublicLocationPath } from '@/utils/location-public.ts'

type LocationCardProps = {
  location: PublicLocationCard
  isFavorite?: boolean
  isFavoriteLoading?: boolean
  onToggleFavorite?: () => void
  imageLoading?: 'eager' | 'lazy'
  imageFetchPriority?: 'high' | 'auto'
  onImageSettled?: () => void
}

function formatLocationCode(locationCode: string) {
  return locationCode.replaceAll('-', ' ')
}

export function LocationCard({
  location,
  isFavorite = false,
  isFavoriteLoading = false,
  onToggleFavorite,
  imageLoading = 'lazy',
  imageFetchPriority = 'auto',
  onImageSettled,
}: LocationCardProps) {
  const { isAuthenticated, loading } = useAuth()
  const [isAuthRequiredModalOpen, setIsAuthRequiredModalOpen] = useState(false)
  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null)
  const [hasImageError, setHasImageError] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const hasReportedSettlementRef = useRef(false)
  const formattedLocationCode = formatLocationCode(location.locationCode)
  const detailPath = buildPublicLocationPath({
    categorySlug: location.categorySlug,
    locationCode: location.locationCode,
    fallbackSlug: location.slug,
  })
  const coverImageUrl = getCloudflareCardImageUrl(location.coverImageUrl)
  const detailLocationState = {
    from: {
      pathname: detailPath,
      search: '',
      hash: '',
    },
  }

  useEffect(() => {
    setLoadedImageUrl(null)
    setHasImageError(false)
    hasReportedSettlementRef.current = false
  }, [coverImageUrl])

  useEffect(() => {
    if (imageRef.current?.complete && imageRef.current.naturalWidth > 0) {
      setLoadedImageUrl(coverImageUrl)
      reportImageSettledOnce()
    }
  }, [coverImageUrl])

  useEffect(() => {
    if (!coverImageUrl) {
      reportImageSettledOnce()
    }
  }, [coverImageUrl])

  function reportImageSettledOnce() {
    if (hasReportedSettlementRef.current) {
      return
    }

    hasReportedSettlementRef.current = true
    onImageSettled?.()
  }

  return (
    <>
    <article className="group relative overflow-hidden rounded-[0.3rem] bg-brand-950 shadow-[0_20px_44px_rgba(0,0,0,0.14)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_64px_rgba(0,0,0,0.22)]">
      {onToggleFavorite ? (
        <div className="absolute right-4 top-4 z-10">
          <FavoriteButton
            active={isFavorite}
            loading={isFavoriteLoading}
            onClick={() => {
              onToggleFavorite()
            }}
          />
        </div>
      ) : null}

      <Link
        to={detailPath}
        aria-label={location.locationCode}
        className="block"
        onClick={(event) => {
          if (loading) {
            event.preventDefault()
            return
          }

          if (isAuthenticated) {
            return
          }

          event.preventDefault()
          setIsAuthRequiredModalOpen(true)
        }}
        state={isAuthenticated ? undefined : detailLocationState}
      >
        <div className="aspect-[16/13] bg-brand-950 lg:aspect-[16/12]">
          {coverImageUrl && !hasImageError ? (
            <img
              key={coverImageUrl}
              ref={imageRef}
              src={coverImageUrl}
              alt={formattedLocationCode}
              loading={imageLoading}
              fetchPriority={imageFetchPriority}
              decoding="async"
              onLoad={(event) => {
                if (event.currentTarget.complete) {
                  setLoadedImageUrl(coverImageUrl)
                  reportImageSettledOnce()
                }
              }}
              onError={() => {
                setHasImageError(true)
                setLoadedImageUrl(null)
                reportImageSettledOnce()
              }}
              className={`h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.06] ${
                loadedImageUrl === coverImageUrl ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(155,120,88,0.55),rgba(32,23,18,0.92))]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.01)_0%,rgba(0,0,0,0.08)_30%,rgba(0,0,0,0.7)_100%)] transition duration-500 group-hover:opacity-95" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.76)_100%)] opacity-95 transition duration-500 group-hover:h-32" />
          <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 pt-5 sm:px-3 sm:pb-3">
            <div className="flex flex-wrap-reverse items-end justify-between gap-x-3 gap-y-1">
              <p className="shrink-0 whitespace-nowrap font-display text-[1.18rem] font-semibold leading-none tracking-[-0.04em] text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)] sm:text-[1.26rem] md:text-[1.36rem] lg:text-[1.48rem] xl:text-[1.6rem] 2xl:text-[1.68rem]">
                {formattedLocationCode}
              </p>
              <p className="max-w-full whitespace-nowrap text-sm leading-tight text-white/78 drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)] sm:text-[0.95rem]">
                {location.departmentName}
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
    <AuthRequiredModal
      isOpen={isAuthRequiredModalOpen}
      onClose={() => {
        setIsAuthRequiredModalOpen(false)
      }}
      title="Accedé para ver esta locación"
      description="Creá una cuenta o iniciá sesión para explorar todas las imágenes y detalles de esta locación."
      primaryAction="register"
      registerLabel="Crear cuenta"
      loginLabel="Ingresar"
      loginState={detailLocationState}
      registerState={detailLocationState}
    />
    </>
  )
}

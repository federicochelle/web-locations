import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'

import type { HomeCategoryCard } from '@/features/home/mocks/home.mock.ts'
import { getCloudflareCardImageUrl } from '@/utils/cloudflare-images.ts'

type CategoryVisualCardProps = {
  category: HomeCategoryCard
  imageLoading?: 'eager' | 'lazy'
  imageFetchPriority?: 'high' | 'auto'
  onImageSettled?: () => void
}

export function CategoryVisualCard({
  category,
  imageLoading = 'lazy',
  imageFetchPriority = 'auto',
  onImageSettled,
}: CategoryVisualCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)
  const hasReportedSettlementRef = useRef(false)
  const backgroundStyle = {
    backgroundImage: category.imageStyle,
  } satisfies CSSProperties
  const imageUrl = getCloudflareCardImageUrl(category.imageUrl)

  useEffect(() => {
    setIsImageLoaded(false)
    setHasImageError(false)
    hasReportedSettlementRef.current = false
  }, [imageUrl])

  useEffect(() => {
    if (!imageUrl) {
      reportImageSettledOnce()
    }
  }, [imageUrl])

  function reportImageSettledOnce() {
    if (hasReportedSettlementRef.current) {
      return
    }

    hasReportedSettlementRef.current = true
    onImageSettled?.()
  }

  return (
    <Link
      to={category.slug ? `/categorias/${category.slug}` : '/locations'}
      aria-label={`Explorar categoria ${category.name}`}
      style={backgroundStyle}
      className="group relative flex aspect-[16/13] overflow-hidden rounded-[0.3rem] bg-brand-950 p-5 shadow-[0_20px_44px_rgba(0,0,0,0.14)] transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_34px_64px_rgba(0,0,0,0.22)] lg:aspect-[16/12]"
    >
      <div className="absolute inset-0 bg-brand-950" aria-hidden="true" />
      {imageUrl && !hasImageError ? (
        <img
          src={imageUrl}
          alt={category.name}
          loading={imageLoading}
          fetchPriority={imageFetchPriority}
          decoding="async"
          onLoad={(event) => {
            if (event.currentTarget.complete) {
              setIsImageLoaded(true)
              reportImageSettledOnce()
            }
          }}
          onError={() => {
            setHasImageError(true)
            setIsImageLoaded(false)
            reportImageSettledOnce()
          }}
          ref={(node) => {
            if (node?.complete && node.naturalWidth > 0) {
              setIsImageLoaded(true)
              reportImageSettledOnce()
            }
          }}
          className={`absolute inset-0 h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.06] ${
            isImageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.01)_0%,rgba(0,0,0,0.08)_30%,rgba(0,0,0,0.7)_100%)] transition duration-500 group-hover:opacity-95" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.76)_100%)] opacity-95 transition duration-500 group-hover:h-32" />
      <div className="relative mt-auto">
        <h3 className="font-display text-3xl font-semibold leading-none tracking-[-0.03em] text-white drop-shadow-[0_3px_14px_rgba(0,0,0,0.42)]">
          {category.name}
        </h3>
      </div>
    </Link>
  )
}

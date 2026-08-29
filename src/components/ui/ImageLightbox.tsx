import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { AppLoading } from '@/components/ui/AppLoading.tsx'
import { getCloudflareLightboxImageUrl } from '@/utils/cloudflare-images.ts'

type ImageLightboxImage = {
  id: string
  url: string
  alt?: string
  isSelected?: boolean
}

type ImageLightboxProps = {
  images: ImageLightboxImage[]
  initialIndex: number
  isOpen: boolean
  imageClassName?: string
  onToggleSelect?: (image: ImageLightboxImage) => void
  onClose: () => void
}

const SWIPE_THRESHOLD_PX = 48
const MAX_IMAGE_SCALE = 3

function getTouchDistance(touches: React.TouchList) {
  const firstTouch = touches[0]
  const secondTouch = touches[1]

  if (!firstTouch || !secondTouch) {
    return null
  }

  return Math.hypot(
    secondTouch.clientX - firstTouch.clientX,
    secondTouch.clientY - firstTouch.clientY,
  )
}

export function ImageLightbox({
  images,
  initialIndex,
  imageClassName = 'rounded-[1.25rem]',
  isOpen,
  onToggleSelect,
  onClose,
}: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [imageScale, setImageScale] = useState(1)
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [hasImageError, setHasImageError] = useState(false)
  const [selectionControlPosition, setSelectionControlPosition] = useState<{
    top: number
    right: number
  } | null>(null)
  const previousBodyOverflowRef = useRef<string>('')
  const previousBodyPositionRef = useRef<string>('')
  const previousBodyTopRef = useRef<string>('')
  const previousBodyWidthRef = useRef<string>('')
  const scrollYRef = useRef(0)
  const touchStartXRef = useRef<number | null>(null)
  const pinchStartDistanceRef = useRef<number | null>(null)
  const pinchStartScaleRef = useRef(1)
  const isPinchingRef = useRef(false)
  const imageViewportRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setActiveIndex(initialIndex)
  }, [initialIndex, isOpen])

  useEffect(() => {
    setImageScale(1)
  }, [activeIndex, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function updateSelectionControlPosition() {
      const viewport = imageViewportRef.current
      const image = imageRef.current

      if (!viewport || !image || !image.complete || image.naturalWidth === 0) {
        return
      }

      const viewportRect = viewport.getBoundingClientRect()
      const imageRect = image.getBoundingClientRect()

      setSelectionControlPosition({
        top: Math.max(12, imageRect.top - viewportRect.top + 12),
        right: Math.max(12, viewportRect.right - imageRect.right + 12),
      })
    }

    window.addEventListener('resize', updateSelectionControlPosition)

    return () => {
      window.removeEventListener('resize', updateSelectionControlPosition)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setIsImageLoading(true)
    setHasImageError(false)
  }, [activeIndex, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goToNext()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goToPrevious()
      }
    }

    scrollYRef.current = window.scrollY
    previousBodyOverflowRef.current = document.body.style.overflow
    previousBodyPositionRef.current = document.body.style.position
    previousBodyTopRef.current = document.body.style.top
    previousBodyWidthRef.current = document.body.style.width

    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollYRef.current}px`
    document.body.style.width = '100%'

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflowRef.current
      document.body.style.position = previousBodyPositionRef.current
      document.body.style.top = previousBodyTopRef.current
      document.body.style.width = previousBodyWidthRef.current
      window.scrollTo({
        top: scrollYRef.current,
        behavior: 'instant',
      })
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [images.length, isOpen, onClose])

  if (!isOpen || images.length === 0) {
    return null
  }

  const activeImage = images[activeIndex]
  const activeImageUrl = getCloudflareLightboxImageUrl(activeImage?.url)

  function goToPrevious() {
    setIsImageLoading(true)
    setHasImageError(false)
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    )
  }

  function goToNext() {
    setIsImageLoading(true)
    setHasImageError(false)
    setActiveIndex((currentIndex) =>
      currentIndex === images.length - 1 ? 0 : currentIndex + 1,
    )
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length === 2) {
      const distance = getTouchDistance(event.touches)

      if (distance !== null) {
        isPinchingRef.current = true
        pinchStartDistanceRef.current = distance
        pinchStartScaleRef.current = imageScale
        touchStartXRef.current = null
      }

      return
    }

    if (event.touches.length === 1) {
      touchStartXRef.current = event.touches[0]?.clientX ?? null
    }
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (event.touches.length !== 2 || pinchStartDistanceRef.current === null) {
      return
    }

    const distance = getTouchDistance(event.touches)

    if (distance === null) {
      return
    }

    event.preventDefault()

    const nextScale = Math.min(
      MAX_IMAGE_SCALE,
      Math.max(1, pinchStartScaleRef.current * (distance / pinchStartDistanceRef.current)),
    )

    setImageScale(nextScale)
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (isPinchingRef.current) {
      if (event.touches.length < 2) {
        pinchStartDistanceRef.current = null
      }

      if (event.touches.length === 0) {
        isPinchingRef.current = false
      }

      touchStartXRef.current = null
      return
    }

    const touchEndX = event.changedTouches[0]?.clientX
    const touchStartX = touchStartXRef.current

    touchStartXRef.current = null

    if (touchStartX === null || touchEndX === undefined || imageScale > 1) {
      return
    }

    const deltaX = touchEndX - touchStartX

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      return
    }

    if (deltaX < 0) {
      goToNext()
    } else {
      goToPrevious()
    }

  }

  function handleTouchCancel() {
    touchStartXRef.current = null
    pinchStartDistanceRef.current = null
    isPinchingRef.current = false
  }

  const lightbox = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/96 px-0 py-0 backdrop-blur-sm transition-opacity duration-200 sm:px-6 sm:py-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Galeria de imagenes"
        className="relative flex max-h-full w-full max-w-[min(92rem,100%)] items-center justify-center lg:h-[82vh] lg:w-[82vw] lg:max-w-[82vw]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-black/32 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Cerrar galeria"
        >
          <span className="text-[1.9rem] leading-none">×</span>
        </button>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-0 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/32 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:inline-flex"
              aria-label="Imagen anterior"
            >
              ←
            </button>

            <button
              type="button"
              onClick={goToNext}
              className="absolute right-0 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/32 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:inline-flex"
              aria-label="Imagen siguiente"
            >
              →
            </button>
          </>
        ) : null}

        <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 rounded-full border border-white/12 bg-black/32 px-4 py-2 text-sm font-medium text-white">
          {activeIndex + 1} de {images.length}
        </div>

        <div
          ref={imageViewportRef}
          className="relative flex h-full w-full touch-none select-none items-center justify-center px-0 pt-14 sm:px-18"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
        >
          {onToggleSelect ? (
            <button
              type="button"
              onClick={() => {
                onToggleSelect(activeImage)
              }}
              className={`absolute right-10 top-3 z-20 inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                activeImage.isSelected
                  ? 'border-brand-300 bg-brand-300 text-brand-950'
                  : 'border-white/12 bg-black/48 text-white hover:bg-white/10'
              }`}
              style={selectionControlPosition ?? undefined}
              aria-pressed={activeImage.isSelected}
              aria-label={
                activeImage.isSelected
                  ? 'Quitar imagen de la seleccion'
                  : 'Seleccionar imagen'
              }
            >
              <span aria-hidden="true" className="mr-2 text-base leading-none">
                {activeImage.isSelected ? '✓' : '+'}
              </span>
              <span>
                {activeImage.isSelected ? 'Seleccionada' : 'Seleccionar'}
              </span>
            </button>
          ) : null}
          <div className="relative inline-flex max-h-full w-full max-w-full sm:w-auto">
            {isImageLoading ? (
              <AppLoading
                compact
                label="Cargando imagen..."
                className="absolute inset-0 z-10 !min-h-0 bg-black/20 !p-0"
              />
            ) : null}
            {hasImageError ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm font-medium text-brand-100/86">
                No pudimos cargar esta imagen.
              </div>
            ) : null}
            <img
              ref={imageRef}
              key={`${activeImage.id}:${activeImageUrl ?? activeImage.url}`}
              src={activeImageUrl ?? activeImage.url}
              alt={activeImage.alt ?? `Imagen ${activeIndex + 1}`}
              className={`max-h-[calc(100dvh-3.5rem)] w-full max-w-full object-contain shadow-[0_24px_80px_rgba(0,0,0,0.4)] transition-opacity duration-150 sm:max-h-full sm:w-auto ${isImageLoading || hasImageError ? 'opacity-0' : 'opacity-100'} ${imageScale === 1 ? 'transition-transform duration-200' : ''} ${imageClassName}`.trim()}
              style={{ transform: `scale(${imageScale})` }}
              onLoad={() => {
                setHasImageError(false)
                setIsImageLoading(false)
                window.requestAnimationFrame(() => {
                  const viewport = imageViewportRef.current
                  const image = imageRef.current

                  if (!viewport || !image) {
                    return
                  }

                  const viewportRect = viewport.getBoundingClientRect()
                  const imageRect = image.getBoundingClientRect()

                  setSelectionControlPosition({
                    top: Math.max(12, imageRect.top - viewportRect.top + 12),
                    right: Math.max(12, viewportRect.right - imageRect.right + 12),
                  })
                })
              }}
              onError={() => {
                setHasImageError(true)
                setIsImageLoading(false)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(lightbox, document.body)
}

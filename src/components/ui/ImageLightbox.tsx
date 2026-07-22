import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  onToggleSelect?: (image: ImageLightboxImage) => void
  onClose: () => void
}

const SWIPE_THRESHOLD_PX = 48

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onToggleSelect,
  onClose,
}: ImageLightboxProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const previousBodyOverflowRef = useRef<string>('')
  const previousBodyPositionRef = useRef<string>('')
  const previousBodyTopRef = useRef<string>('')
  const previousBodyWidthRef = useRef<string>('')
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setActiveIndex(initialIndex)
  }, [initialIndex, isOpen])

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
        setActiveIndex((currentIndex) =>
          currentIndex === images.length - 1 ? 0 : currentIndex + 1,
        )
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActiveIndex((currentIndex) =>
          currentIndex === 0 ? images.length - 1 : currentIndex - 1,
        )
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

  function goToPrevious() {
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? images.length - 1 : currentIndex - 1,
    )
  }

  function goToNext() {
    setActiveIndex((currentIndex) =>
      currentIndex === images.length - 1 ? 0 : currentIndex + 1,
    )
  }

  function handleTouchEnd(touchEndX: number) {
    if (touchStartX === null) {
      return
    }

    const deltaX = touchEndX - touchStartX

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) {
      setTouchStartX(null)
      return
    }

    if (deltaX < 0) {
      goToNext()
    } else {
      goToPrevious()
    }

    setTouchStartX(null)
  }

  const lightbox = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/96 px-4 py-4 backdrop-blur-sm transition-opacity duration-200 sm:px-6 sm:py-6"
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
        className="relative flex max-h-full w-full max-w-[min(92rem,100%)] items-center justify-center"
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
              className="absolute left-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/32 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Imagen anterior"
            >
              ←
            </button>

            <button
              type="button"
              onClick={goToNext}
              className="absolute right-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-black/32 text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
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
          className="flex h-full w-full items-center justify-center px-12 pt-14 sm:px-18"
          onTouchStart={(event) => {
            setTouchStartX(event.changedTouches[0]?.clientX ?? null)
          }}
          onTouchEnd={(event) => {
            handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)
          }}
        >
          <div className="relative inline-flex max-h-full max-w-full">
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

            <img
              src={activeImage.url}
              alt={activeImage.alt ?? `Imagen ${activeIndex + 1}`}
              className="max-h-full max-w-full rounded-[1.25rem] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.4)] transition-transform duration-200"
            />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(lightbox, document.body)
}

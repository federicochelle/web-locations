import { useEffect, useRef, useState } from 'react'

import coverBackgroundUrl from '@/assets/pdf/cover-background.jpg'
import logoUrl from '../../../logo.webp'
import type { SelectionPdfPayload } from '@/types/selection-pdf.ts'
import {
  PDF_CATEGORY_COVER_OVERLAY_OPACITY,
  formatPdfLocationCode,
  isHorizontalPhoto,
  planSelectionPdfPages,
} from '@/utils/selection-pdf-layout.ts'

type SelectionPdfPreviewProps = {
  payload: SelectionPdfPayload
  hideCover?: boolean
}

// Mirrors the A4 landscape layout of the exporter. Pages are designed at 1123 x 794 px
// (A4 at 96 dpi) and scaled down as a whole to fit the available width.
const PAGE_WIDTH_PX = 1123
const PAGE_HEIGHT_PX = 794
const ACCENT = '#e5be6b'

// 'cover' paints the texture as is; 'category' adds a black veil over it. Photo pages use
// neither and keep the plain dark background.
type PageBackground = 'cover' | 'category'

function ScaledPage({
  children,
  background,
}: {
  children: React.ReactNode
  background?: PageBackground
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    function updateScale() {
      if (container) {
        setScale(Math.min(1, container.clientWidth / PAGE_WIDTH_PX))
      }
    }

    updateScale()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScale)

      return () => {
        window.removeEventListener('resize', updateScale)
      }
    }

    const resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="mx-auto w-full" style={{ maxWidth: PAGE_WIDTH_PX }}>
      <div style={{ width: PAGE_WIDTH_PX * scale, height: PAGE_HEIGHT_PX * scale }}>
        <section
          className="relative origin-top-left overflow-hidden border border-[#e2dcd3]/30 bg-[#080808] text-[#d7c0a2] shadow-[0_28px_80px_rgba(0,0,0,0.28)]"
          style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, transform: `scale(${scale})` }}
        >
          {background ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `${
                  background === 'category'
                    ? `linear-gradient(rgba(0, 0, 0, ${PDF_CATEGORY_COVER_OVERLAY_OPACITY}), rgba(0, 0, 0, ${PDF_CATEGORY_COVER_OVERLAY_OPACITY})), `
                    : ''
                }url(${coverBackgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ) : null}
          <div className="relative h-full w-full">{children}</div>
        </section>
      </div>
    </div>
  )
}

function CoverLogo({
  src,
  alt,
  single,
  onError,
}: {
  src: string
  alt: string
  single: boolean
  onError: () => void
}) {
  return (
    <img
      src={src}
      alt={alt}
      onError={onError}
      className={`w-auto object-contain ${
        single ? 'h-[104px] max-w-[340px]' : 'h-[88px] max-w-[260px]'
      }`}
    />
  )
}

function MainCoverPage({ project }: { project: SelectionPdfPayload['project'] }) {
  const [failedLogoUrls, setFailedLogoUrls] = useState<string[]>([])
  const productLogoUrl =
    project.productLogoUrl && !failedLogoUrls.includes(project.productLogoUrl)
      ? project.productLogoUrl
      : null
  const companyLogoUrl =
    project.productionCompanyLogoUrl && !failedLogoUrls.includes(project.productionCompanyLogoUrl)
      ? project.productionCompanyLogoUrl
      : null
  const logoCount = Number(Boolean(productLogoUrl)) + Number(Boolean(companyLogoUrl))
  const productName = project.product.trim() || 'Selección de locaciones'
  const companyName = project.productionCompany.trim()

  function markLogoFailed(url: string) {
    setFailedLogoUrls((current) => [...current, url])
  }

  return (
    <ScaledPage background="cover">
      {logoCount > 0 ? (
        <div className="absolute inset-x-0 top-[174px] flex items-center justify-center gap-10">
          {productLogoUrl ? (
            <CoverLogo
              src={productLogoUrl}
              alt={productName}
              single={logoCount === 1}
              onError={() => markLogoFailed(productLogoUrl)}
            />
          ) : null}
          {logoCount === 2 ? (
            <div className="h-16 w-px" style={{ backgroundColor: ACCENT, opacity: 0.5 }} />
          ) : null}
          {companyLogoUrl ? (
            <CoverLogo
              src={companyLogoUrl}
              alt={companyName || 'Productora'}
              single={logoCount === 1}
              onError={() => markLogoFailed(companyLogoUrl)}
            />
          ) : null}
        </div>
      ) : null}

      <div className="absolute inset-0 flex flex-col items-center justify-center px-24 text-center">
        <h1
          className={`font-display max-w-[860px] font-semibold leading-[1.05] tracking-[-0.03em] ${
            logoCount > 0 ? 'text-[56px]' : 'text-[84px]'
          }`}
        >
          {productName}
        </h1>

        {logoCount === 0 ? (
          <div className="mt-8 h-[2px] w-24" style={{ backgroundColor: ACCENT, opacity: 0.85 }} />
        ) : null}

        {companyName ? (
          <p
            className={`text-[13px] font-medium uppercase tracking-[0.32em] text-[#d7c0a2]/80 ${
              logoCount > 0 ? 'mt-5' : 'mt-7'
            }`}
          >
            {companyName}
          </p>
        ) : null}
      </div>

      <img
        src={logoUrl}
        alt="Sitio Locaciones"
        className="absolute bottom-[42px] left-1/2 h-[45px] w-auto -translate-x-1/2 object-contain opacity-90"
      />
    </ScaledPage>
  )
}

function CategoryCoverPage({ categoryName }: { categoryName: string }) {
  return (
    <ScaledPage background="category">
      <div className="flex h-full items-center justify-center px-12 text-center">
        <h2 className="font-display text-[72px] font-semibold leading-none tracking-[-0.03em]">
          {categoryName}
        </h2>
      </div>
    </ScaledPage>
  )
}

// Horizontal photos fill the whole cell (slight side crop); vertical and square ones stay
// fully visible. Until the image loads its ratio is unknown, so it starts as "contain".
function PhotoCell({ src, alt }: { src: string; alt: string }) {
  const [isHorizontal, setIsHorizontal] = useState(false)

  return (
    <div className="relative min-h-0 overflow-hidden bg-[#101010]">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget
          setIsHorizontal(isHorizontalPhoto(naturalWidth, naturalHeight))
        }}
        className={`h-full w-full ${isHorizontal ? 'object-cover' : 'object-contain'}`}
        style={{ objectPosition: 'center' }}
      />
    </div>
  )
}

function PhotosPage({
  locationCode,
  variant,
  photos,
}: {
  locationCode: string
  variant: 'hero' | 'grid'
  photos: Array<{ key: string; imageUrl: string }>
}) {
  return (
    <ScaledPage>
      <header
        className={`absolute inset-x-5 flex items-center justify-between ${
          variant === 'hero' ? 'top-0 h-[53px]' : 'top-3 h-[26px]'
        }`}
      >
        <span
          className={`font-display font-semibold tracking-[0.04em] ${
            variant === 'hero' ? 'text-[37px]' : 'text-lg'
          }`}
        >
          {formatPdfLocationCode(locationCode)}
        </span>
        <img
          src={logoUrl}
          alt="Sitio Locaciones"
          className={`w-auto object-contain opacity-90 ${
            variant === 'hero' ? 'h-[45px]' : 'h-[22px]'
          }`}
        />
      </header>

      <div
        className={`absolute inset-x-5 bottom-5 grid gap-[3px] ${
          variant === 'hero'
            ? 'top-[53px] grid-cols-1 grid-rows-1'
            : 'top-[46px] grid-cols-2 grid-rows-2'
        }`}
      >
        {photos.map((photo) => (
          <PhotoCell
            key={photo.key}
            src={photo.imageUrl}
            alt={`Imagen seleccionada de ${locationCode}`}
          />
        ))}
      </div>
    </ScaledPage>
  )
}

export function SelectionPdfPreview({
  payload,
  hideCover = false,
}: SelectionPdfPreviewProps) {
  const pages = planSelectionPdfPages(
    payload.locations.map((location) => ({
      locationCode: location.locationCode,
      categorySlug: location.categorySlug,
      categoryName: location.categoryName,
      items: location.images,
    })),
  )

  return (
    <div className="space-y-6">
      {!hideCover ? <MainCoverPage project={payload.project} /> : null}

      {pages.map((page, pageIndex) => {
        if (page.kind === 'category') {
          return <CategoryCoverPage key={`category-${pageIndex}`} categoryName={page.categoryName} />
        }

        return (
          <PhotosPage
            key={`photos-${pageIndex}`}
            locationCode={page.locationCode}
            variant={page.variant}
            photos={page.items}
          />
        )
      })}
    </div>
  )
}

import { useContext, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import logoUrl from '../../logo.webp'
import { homeMosaicImages } from '@/features/home/components/homeMosaicImages.ts'
import { ImageSelectionContext } from '@/providers/ImageSelectionProvider.tsx'
import { RequestProjectsContext } from '@/providers/RequestProjectsContext.ts'

// Development-only visual mock of the upcoming landscape PDF design. It is not used by the
// real exporter or by the export flow preview. A4 landscape at 96 dpi is 1123 x 794 px.

const PAGE_WIDTH_PX = 1123
const PAGE_HEIGHT_PX = 794
const PHOTOS_PER_PAGE = 4
const ACCENT = '#e5be6b'

type PreviewPhoto = { key: string; src: string }
type PreviewLocation = { code: string; photos: PreviewPhoto[] }
type PreviewCategory = { name: string; locations: PreviewLocation[] }

type PreviewPage =
  | { kind: 'category'; pageNumber: number; categoryName: string }
  | {
      kind: 'photos'
      variant: 'hero' | 'grid'
      pageNumber: number
      categoryName: string
      locationCode: string
      photos: PreviewPhoto[]
    }

// Vertical stand-in photo (2:3) to check how a portrait hero is handled.
const FIXTURE_VERTICAL_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a3b2e"/><stop offset="1" stop-color="#1c2630"/></linearGradient></defs><rect width="800" height="1200" fill="url(#g)"/><text x="50%" y="50%" fill="#f4efe8" fill-opacity="0.7" font-family="Helvetica, Arial, sans-serif" font-size="64" font-weight="700" letter-spacing="6" text-anchor="middle" dominant-baseline="central">VERTICAL</text></svg>',
)}`

function fixturePhotos(prefix: string, sources: string[]): PreviewPhoto[] {
  return sources.map((src, index) => ({ key: `${prefix}-${index}`, src }))
}

const FIXTURE_CATEGORIES: PreviewCategory[] = [
  {
    name: 'Casas',
    locations: [
      {
        // Hero + one full 2x2 grid.
        code: 'CAS 0012',
        photos: fixturePhotos('cas-12', homeMosaicImages.slice(0, 5).map((image) => image.src)),
      },
      {
        // Vertical hero + a partial grid (2 photos).
        code: 'CAS 0020',
        photos: fixturePhotos('cas-20', [
          FIXTURE_VERTICAL_PHOTO,
          ...homeMosaicImages.slice(5, 7).map((image) => image.src),
        ]),
      },
    ],
  },
  {
    name: 'Playas',
    locations: [
      {
        // A single photo: hero page only.
        code: 'PLA 0031',
        photos: fixturePhotos('pla-31', [homeMosaicImages[7].src]),
      },
    ],
  },
]

function formatCategoryName(slug: string) {
  const name = slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return name || 'Sin categoría'
}

function buildCategoriesFromSelection(
  images: Array<{
    key: string
    imageUrl: string
    categorySlug: string
    locationId: string
    locationCode: string
    sortOrder: number | null
  }>,
): PreviewCategory[] {
  const categories = new Map<string, Map<string, PreviewLocation>>()
  const sortedImages = [...images].sort(
    (left, right) =>
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER),
  )

  for (const image of sortedImages) {
    const locations = categories.get(image.categorySlug) ?? new Map<string, PreviewLocation>()
    const location = locations.get(image.locationId) ?? {
      code: image.locationCode.replace(/-/g, ' '),
      photos: [],
    }

    location.photos.push({ key: image.key, src: image.imageUrl })
    locations.set(image.locationId, location)
    categories.set(image.categorySlug, locations)
  }

  return [...categories.entries()].map(([slug, locations]) => ({
    name: formatCategoryName(slug),
    locations: [...locations.values()],
  }))
}

function buildPages(categories: PreviewCategory[]): PreviewPage[] {
  const pages: PreviewPage[] = []

  for (const category of categories) {
    if (category.locations.every((location) => location.photos.length === 0)) {
      continue
    }

    pages.push({ kind: 'category', pageNumber: pages.length + 1, categoryName: category.name })

    // Per location: photo 1 is a hero page, the rest follow in 2x2 pages of 4. Pages never
    // mix photos from different locations.
    for (const location of category.locations) {
      const [heroPhoto, ...gridPhotos] = location.photos

      if (!heroPhoto) {
        continue
      }

      pages.push({
        kind: 'photos',
        variant: 'hero',
        pageNumber: pages.length + 1,
        categoryName: category.name,
        locationCode: location.code,
        photos: [heroPhoto],
      })

      for (let index = 0; index < gridPhotos.length; index += PHOTOS_PER_PAGE) {
        pages.push({
          kind: 'photos',
          variant: 'grid',
          pageNumber: pages.length + 1,
          categoryName: category.name,
          locationCode: location.code,
          photos: gridPhotos.slice(index, index + PHOTOS_PER_PAGE),
        })
      }
    }
  }

  return pages
}

function usePageScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function updateScale() {
      setScale(Math.min(1, (window.innerWidth - 48) / PAGE_WIDTH_PX))
    }

    updateScale()
    window.addEventListener('resize', updateScale)

    return () => {
      window.removeEventListener('resize', updateScale)
    }
  }, [])

  return scale
}

// Soft golden radial halo behind the main cover content. Category covers and photo pages
// use a plain dark background.
function CoverHalo() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 55% 60% at 50% 50%, rgba(229, 190, 107, 0.12), transparent 70%)',
      }}
    />
  )
}

// Pages are laid out at a fixed 1123 x 794 px and scaled down as a whole on narrow screens,
// so gaps and sizes keep their proportions.
function PageFrame({
  children,
  halo = false,
}: {
  children: React.ReactNode
  halo?: boolean
}) {
  const scale = usePageScale()

  return (
    <div
      className="shrink-0"
      style={{ width: PAGE_WIDTH_PX * scale, height: PAGE_HEIGHT_PX * scale }}
    >
      <section
        className="relative origin-top-left overflow-hidden bg-[#080808] text-[#d7c0a2] shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
        style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX, transform: `scale(${scale})` }}
      >
        {halo ? <CoverHalo /> : null}
        <div className="relative h-full w-full">{children}</div>
      </section>
    </div>
  )
}

type CoverProject = {
  product: string
  productLogoUrl: string | null
  productionCompany: string
  productionCompanyLogoUrl: string | null
}

function buildFixtureLogo(label: string, width: number, height: number, fill: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" rx="10" fill="${fill}"/><text x="50%" y="50%" fill="#f4efe8" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(height * 0.3)}" font-weight="700" letter-spacing="3" text-anchor="middle" dominant-baseline="central">${label}</text></svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Different aspect ratios on purpose, to check object-contain and equal visual height.
const FIXTURE_PRODUCT_LOGO = buildFixtureLogo('PRODUCTO', 480, 160, '#3b2f26')
const FIXTURE_COMPANY_LOGO = buildFixtureLogo('PRODUCTORA', 240, 200, '#26303b')

const COVER_FIXTURES: Array<{ key: string; caption: string; project: CoverProject }> = [
  {
    key: 'both',
    caption: 'Fallback 1: ambos logos',
    project: {
      product: 'Campaña Verano 2026',
      productLogoUrl: FIXTURE_PRODUCT_LOGO,
      productionCompany: 'Productora de ejemplo',
      productionCompanyLogoUrl: FIXTURE_COMPANY_LOGO,
    },
  },
  {
    key: 'product',
    caption: 'Fallback 2: solo logo de producto',
    project: {
      product: 'Campaña Verano 2026',
      productLogoUrl: FIXTURE_PRODUCT_LOGO,
      productionCompany: 'Productora de ejemplo',
      productionCompanyLogoUrl: null,
    },
  },
  {
    key: 'company',
    caption: 'Fallback 3: solo logo de productora',
    project: {
      product: 'Campaña Verano 2026',
      productLogoUrl: null,
      productionCompany: 'Productora de ejemplo',
      productionCompanyLogoUrl: FIXTURE_COMPANY_LOGO,
    },
  },
  {
    key: 'none',
    caption: 'Fallback 4: sin logos',
    project: {
      product: 'Campaña Verano 2026',
      productLogoUrl: null,
      productionCompany: 'Productora de ejemplo',
      productionCompanyLogoUrl: null,
    },
  },
  {
    key: 'bare',
    caption: 'Fallback 4b: sin logos ni productora',
    project: {
      product: 'Campaña Verano 2026',
      productLogoUrl: null,
      productionCompany: '',
      productionCompanyLogoUrl: null,
    },
  },
]

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

function CoverPage({ project }: { project: CoverProject }) {
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
    <PageFrame halo>
      <div className="flex h-full flex-col items-center justify-center px-24 pb-16 text-center">
        {logoCount > 0 ? (
          <div className="flex items-center justify-center gap-10">
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

        <h1
          className={`font-display max-w-[860px] font-semibold leading-[1.05] tracking-[-0.03em] ${
            logoCount > 0 ? 'mt-12 text-[56px]' : 'text-[84px]'
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
        className="absolute bottom-9 left-1/2 h-9 w-auto -translate-x-1/2 object-contain opacity-90"
      />
    </PageFrame>
  )
}

function CategoryPage({ categoryName }: { categoryName: string }) {
  return (
    <PageFrame>
      <div className="flex h-full flex-col justify-center px-24">
        <h2 className="font-display text-[72px] font-semibold leading-none tracking-[-0.03em]">
          {categoryName}
        </h2>
      </div>
    </PageFrame>
  )
}

// Horizontal photos fill the whole cell (slight side crop); vertical and square ones stay
// fully visible. Until the image loads its ratio is unknown, so it starts as "contain".
const HORIZONTAL_RATIO_THRESHOLD = 1.1

function PhotoCell({ src }: { src: string }) {
  const [isHorizontal, setIsHorizontal] = useState(false)

  return (
    <div className="relative min-h-0 overflow-hidden bg-[#101010]">
      <img
        src={src}
        alt=""
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget
          setIsHorizontal(naturalHeight > 0 && naturalWidth / naturalHeight > HORIZONTAL_RATIO_THRESHOLD)
        }}
        className={`h-full w-full ${isHorizontal ? 'object-cover' : 'object-contain'}`}
        style={{ objectPosition: 'center' }}
      />
    </div>
  )
}

function PhotosPage({
  locationCode,
  photos,
  variant,
}: {
  locationCode: string
  photos: PreviewPhoto[]
  variant: 'hero' | 'grid'
}) {
  return (
    <PageFrame>
      <header className="absolute inset-x-5 top-3 flex h-[26px] items-center justify-between">
        <span className="font-display text-lg font-semibold tracking-[0.04em]">{locationCode}</span>
        <img src={logoUrl} alt="Sitio Locaciones" className="h-[22px] w-auto object-contain opacity-90" />
      </header>

      <div
        className={`absolute inset-x-5 bottom-5 top-[46px] grid gap-[3px] ${
          variant === 'hero' ? 'grid-cols-1 grid-rows-1' : 'grid-cols-2 grid-rows-2'
        }`}
      >
        {photos.map((photo) => (
          <PhotoCell key={photo.key} src={photo.src} />
        ))}
      </div>
    </PageFrame>
  )
}

export function PdfPreviewPage() {
  const [searchParams] = useSearchParams()
  const selectionImages = useContext(ImageSelectionContext)?.images ?? []
  const forceFixture = searchParams.get('fixture') === '1'
  const usingSelection = !forceFixture && selectionImages.length > 0
  const categories = usingSelection
    ? buildCategoriesFromSelection(selectionImages)
    : FIXTURE_CATEGORIES
  const pages = buildPages(categories)
  const activeProjectId = useContext(ImageSelectionContext)?.activeProjectId ?? null
  const activeProject =
    useContext(RequestProjectsContext)?.projects.find((project) => project.id === activeProjectId) ??
    null
  const fixtureCover =
    COVER_FIXTURES.find((fixture) => fixture.key === searchParams.get('cover')) ??
    COVER_FIXTURES[0]!
  const usingRealProject = Boolean(activeProject) && !forceFixture
  const coverProject: CoverProject =
    activeProject && usingRealProject
      ? {
          product: activeProject.title,
          productLogoUrl: activeProject.productLogoUrl,
          productionCompany: activeProject.productionCompany ?? '',
          productionCompanyLogoUrl: activeProject.productionCompanyLogoUrl,
        }
      : fixtureCover.project

  return (
    <div className="min-h-screen bg-[#2a2a2a] px-6 py-8">
      <div className="mx-auto mb-6 max-w-[1123px] rounded border border-white/15 bg-black/40 px-4 py-3 text-sm text-white/80">
        <p className="font-semibold text-white">Preview temporal del diseño de PDF (solo desarrollo)</p>
        <p className="mt-1">
          {usingSelection
            ? `Usando tu selección actual (${selectionImages.length} imágenes). Agregá ?fixture=1 para ver datos de ejemplo.`
            : 'Sin selección disponible: se muestran datos de ejemplo solo para visualizar el layout.'}
        </p>
        <p className="mt-1">
          {usingRealProject
            ? 'Portada con los datos del proyecto activo.'
            : `Portada de ejemplo: ${fixtureCover.caption}. Probá ?cover=${COVER_FIXTURES.map((fixture) => fixture.key).join(' | ')}.`}
        </p>
      </div>

      <div className="flex flex-col items-center gap-8 overflow-x-auto">
        <CoverPage project={coverProject} />

        {pages.map((page) => {
          if (page.kind === 'category') {
            return (
              <CategoryPage key={page.pageNumber} categoryName={page.categoryName} />
            )
          }

          return (
            <PhotosPage
              key={page.pageNumber}
              locationCode={page.locationCode}
              photos={page.photos}
              variant={page.variant}
            />
          )
        })}
      </div>
    </div>
  )
}

// Page planning shared by the PDF exporter (jsPDF) and the in-app preview, so both always
// produce the same sequence of pages.

export const PDF_PHOTOS_PER_GRID_PAGE = 4
export const PDF_HORIZONTAL_RATIO_THRESHOLD = 1.1
// Black veil over the cover texture on category covers, so the title keeps strong contrast.
export const PDF_CATEGORY_COVER_OVERLAY_OPACITY = 0.72

const FALLBACK_CATEGORY_NAME = 'Otras locaciones'
const LEGACY_FALLBACK_CATEGORY_NAME = 'Sin categoria'

export type PdfPlanLocation<T> = {
  locationCode: string
  categorySlug: string
  categoryName?: string | null
  items: T[]
}

export type PlannedPdfPage<T> =
  | { kind: 'category'; categoryName: string }
  | { kind: 'photos'; variant: 'hero' | 'grid'; locationCode: string; items: T[] }

export function isHorizontalPhoto(width: number, height: number) {
  return height > 0 && width / height > PDF_HORIZONTAL_RATIO_THRESHOLD
}

export function formatCategoryNameFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function resolvePdfCategoryName(location: {
  categorySlug: string
  categoryName?: string | null
}) {
  const name = location.categoryName?.trim()

  if (name && name !== LEGACY_FALLBACK_CATEGORY_NAME) {
    return name
  }

  return formatCategoryNameFromSlug(location.categorySlug.trim()) || FALLBACK_CATEGORY_NAME
}

export function formatPdfLocationCode(value: string) {
  return value.replace(/-/g, ' ')
}

// Categories keep the order in which they first appear. Locations inside a category keep
// their incoming order, and a page never mixes photos of different locations. Per location,
// the first photo is a "hero" page and the rest follow in grids of four. Locations without
// items (e.g. every image failed to load) produce no pages, and categories without pages
// produce no cover.
export function planSelectionPdfPages<T>(locations: PdfPlanLocation<T>[]): PlannedPdfPage<T>[] {
  const categories = new Map<string, { name: string; locations: PdfPlanLocation<T>[] }>()

  for (const location of locations) {
    const name = resolvePdfCategoryName(location)
    const key = location.categorySlug.trim() || name
    const category = categories.get(key) ?? { name, locations: [] }

    category.locations.push(location)
    categories.set(key, category)
  }

  const pages: PlannedPdfPage<T>[] = []

  for (const category of categories.values()) {
    const categoryPages: PlannedPdfPage<T>[] = []

    for (const location of category.locations) {
      const [heroItem, ...gridItems] = location.items

      if (heroItem === undefined) {
        continue
      }

      categoryPages.push({
        kind: 'photos',
        variant: 'hero',
        locationCode: location.locationCode,
        items: [heroItem],
      })

      for (let index = 0; index < gridItems.length; index += PDF_PHOTOS_PER_GRID_PAGE) {
        categoryPages.push({
          kind: 'photos',
          variant: 'grid',
          locationCode: location.locationCode,
          items: gridItems.slice(index, index + PDF_PHOTOS_PER_GRID_PAGE),
        })
      }
    }

    if (categoryPages.length > 0) {
      pages.push({ kind: 'category', categoryName: category.name }, ...categoryPages)
    }
  }

  return pages
}

import type { PublicLocationCard } from '@/types/location.ts'

type PublicLocationCardSource = {
  id: string
  locationCode?: string | null
  categorySlug?: string | null
  categoryName?: string | null
  departmentName?: string | null
  zoneName?: string | null
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  features?: string[] | null
  matchedFeatureCount?: number | null
  selectedFeatureCount?: number | null
}

export function normalizePublicValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function buildPublicSlug(locationCode?: string | null) {
  if (!locationCode) {
    return null
  }

  return normalizePublicValue(locationCode)
}

export function buildPublicLocationPath({
  categorySlug,
  locationCode,
  fallbackSlug,
}: {
  categorySlug?: string | null
  locationCode?: string | null
  fallbackSlug?: string | null
}) {
  const normalizedCategorySlug = categorySlug?.trim() ?? ''
  const normalizedLocationCode = locationCode?.trim() ?? ''

  if (normalizedCategorySlug && normalizedLocationCode) {
    return `/categorias/${normalizedCategorySlug}/${normalizedLocationCode}`
  }

  return `/locations/${fallbackSlug ?? buildPublicSlug(locationCode) ?? ''}`
}

export function mapPublicLocationCard(
  row: PublicLocationCardSource,
): PublicLocationCard {
  const publicSlug = buildPublicSlug(row.locationCode) ?? row.id
  const publicLocationCode = row.locationCode?.trim() || publicSlug

  return {
    id: row.id,
    slug: publicSlug,
    title: publicLocationCode,
    locationCode: publicLocationCode,
    categorySlug: row.categorySlug?.trim() || null,
    categoryName: row.categoryName ?? 'Sin categoria',
    departmentName: row.departmentName ?? 'Sin departamento',
    zoneName: row.zoneName ?? 'Sin zona',
    coverImageUrl: row.coverImageUrl ?? null,
    coverImageAlt: row.coverImageAlt ?? 'Imagen de locacion',
    features: row.features ?? [],
    matchedFeatureCount: row.matchedFeatureCount ?? undefined,
    selectedFeatureCount: row.selectedFeatureCount ?? undefined,
    featureMatchMode: null,
  }
}

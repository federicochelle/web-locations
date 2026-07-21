import { supabase } from '@/lib/supabase.ts'
import type {
  PublicLocationCard,
  PublicLocationDetail,
} from '@/types/location.ts'
import {
  buildPublicSlug,
  mapPublicLocationCard,
  normalizePublicValue,
} from '@/utils/location-public.ts'

type RelatedEntity = {
  id?: string | null
  name?: string | null
  slug?: string | null
}

type CategoryLookupRow = {
  id: string
  name: string | null
  slug: string | null
}

type LocationImageRow = {
  id?: string | null
  url?: string | null
  is_cover?: boolean | null
  sort_order?: number | null
}

type LocationFeatureRow = {
  features?: {
    name?: string | null
    slug?: string | null
    aliases?: string[] | null
  } | null
}

type LocationRow = {
  id: string
  slug: string | null
  title: string | null
  description?: string | null
  location_code?: string | null
  approx_lat?: number | null
  approx_lng?: number | null
  approx_radius?: number | null
  category_id?: string | null
  published?: boolean | null
  categories?: RelatedEntity | RelatedEntity[] | null
  departments?: RelatedEntity | null
  zones?: RelatedEntity | null
  location_images?: LocationImageRow[] | null
  location_features?: LocationFeatureRow[] | null
}

type SearchPublicLocationsRow = {
  id: string
  slug?: string | null
  location_code?: string | null
  category_slug?: string | null
  category_name?: string | null
  department_name?: string | null
  zone_name?: string | null
  cover_image_url?: string | null
  cover_image_alt?: string | null
  features?: string[] | null
  matched_feature_count?: number | null
  selected_feature_count?: number | null
}

export type ActiveCategory = {
  name: string
  slug: string
}

export type GetLocationsResult = {
  locations: PublicLocationCard[]
  activeCategory: ActiveCategory | null
  categoryExists: boolean
}

type GetLocationsFilters = {
  categorySlug?: string | null
  search?: string | null
  featureSlugs?: string[]
}

function sortImages(images: LocationImageRow[] | null | undefined) {
  return [...(images ?? [])].sort(
    (left, right) =>
      (left.sort_order ?? Number.MAX_SAFE_INTEGER) -
      (right.sort_order ?? Number.MAX_SAFE_INTEGER),
  )
}

function buildLocationCodeFromSlug(publicSlug: string) {
  const normalizedPublicSlug = normalizePublicValue(publicSlug)

  if (!normalizedPublicSlug) {
    return null
  }

  return normalizedPublicSlug.toUpperCase()
}

function parseApproxCoordinate(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return value
}

function parseApproxRadius(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null
  }

  return value
}

function mapSearchPublicLocationsRow(
  row: SearchPublicLocationsRow,
): PublicLocationCard {
  return mapPublicLocationCard({
    id: row.id,
    locationCode: row.location_code ?? row.id,
    categorySlug: row.category_slug ?? null,
    categoryName: row.category_name ?? null,
    departmentName: row.department_name ?? null,
    zoneName: row.zone_name ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    coverImageAlt: row.cover_image_alt ?? 'Imagen de locacion',
    features: row.features ?? [],
    matchedFeatureCount: row.matched_feature_count ?? null,
    selectedFeatureCount: row.selected_feature_count ?? null,
  })
}

function normalizeFeatureSlugs(featureSlugs?: string[]) {
  return [...new Set(
    (featureSlugs ?? [])
      .map((featureSlug) => featureSlug.trim())
      .filter((featureSlug) => featureSlug.length > 0),
  )]
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

async function enrichLocationsWithCategorySlugs(
  rows: SearchPublicLocationsRow[],
  fallbackCategorySlug: string | null,
) {
  if (fallbackCategorySlug) {
    return rows.map((row) => ({
      ...row,
      category_slug: row.category_slug ?? fallbackCategorySlug,
    }))
  }

  const categoryNames = [...new Set(
    rows
      .map((row) => row.category_name?.trim() ?? '')
      .filter((categoryName) => categoryName.length > 0 && categoryName !== 'Sin categoria'),
  )]

  if (categoryNames.length === 0) {
    return rows
  }

  const { data, error } = await supabase
    .from('categories')
    .select('name, slug')
    .in('name', categoryNames)

  if (error) {
    throw new Error(error.message)
  }

  const categorySlugByName = new Map<string, string>()

  for (const category of (data ?? []) as { name?: string | null; slug?: string | null }[]) {
    const categoryName = category.name?.trim()
    const categorySlug = category.slug?.trim()

    if (!categoryName || !categorySlug) {
      continue
    }

    categorySlugByName.set(categoryName, categorySlug)
  }

  return rows.map((row) => ({
    ...row,
    category_slug:
      row.category_slug ??
      categorySlugByName.get(row.category_name?.trim() ?? '') ??
      null,
  }))
}

async function getLocationsFromRpc({
  categorySlug,
  query,
  featureSlugs,
  tagSlugs,
  limit,
  offset,
}: {
  categorySlug: string | null
  query: string | null
  featureSlugs: string[]
  tagSlugs: string[]
  limit: number
  offset: number
}) {
  const { data, error } = await supabase.rpc('search_public_locations_v2', {
    p_query: query,
    p_category_slug: categorySlug,
    p_feature_slugs: featureSlugs,
    p_tag_slugs: tagSlugs,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    throw new Error(error.message)
  }

  const rowsWithCategorySlugs = await enrichLocationsWithCategorySlugs(
    (data ?? []) as SearchPublicLocationsRow[],
    categorySlug,
  )

  return rowsWithCategorySlugs.map((row) =>
    mapSearchPublicLocationsRow(row),
  )
}

export async function getLocations(
  filters: GetLocationsFilters = {},
): Promise<GetLocationsResult> {
  const categorySlug = filters.categorySlug?.trim() ?? null
  const normalizedSearch = filters.search?.trim() ?? ''
  const normalizedFeatureSlugs = normalizeFeatureSlugs(filters.featureSlugs)
  let activeCategory: ActiveCategory | null = null

  if (categorySlug) {
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', categorySlug)
      .single()

    if (categoryError) {
      if (categoryError.code === 'PGRST116') {
        return {
          locations: [],
          activeCategory: null,
          categoryExists: false,
        }
      }

      throw new Error(categoryError.message)
    }

    const resolvedCategory = category satisfies CategoryLookupRow
    activeCategory = {
      name: resolvedCategory.name ?? 'Categoria sin nombre',
      slug: resolvedCategory.slug ?? categorySlug,
    }
  }

  const locations = await getLocationsFromRpc({
    categorySlug,
    query: normalizedSearch || null,
    featureSlugs: normalizedFeatureSlugs,
    tagSlugs: [],
    limit: 24,
    offset: 0,
  })

  return {
    locations,
    activeCategory,
    categoryExists: true,
  }
}

export async function getLocationByLocationCode(publicSlug: string) {
  const locationCode = buildLocationCodeFromSlug(publicSlug)

  if (!locationCode) {
    return null
  }

  const { data, error } = await supabase
    .from('locations')
    .select(
      `
      id,
      slug,
      title,
      description,
      location_code,
      approx_lat,
      approx_lng,
        approx_radius,
        published,
        departments (
          name
        ),
        zones (
          name
        ),
        categories (
          slug
        ),
        location_images (
          id,
          url,
          sort_order
        )
      `,
    )
    .eq('published', true)
    .eq('location_code', locationCode)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      throw new Error(error.message)
    }

    const fallback = await supabase
      .from('locations')
      .select(
        `
          id,
          slug,
          title,
          description,
          location_code,
          approx_lat,
          approx_lng,
          approx_radius,
          published,
          departments (
            name
          ),
          zones (
            name
          ),
          categories (
            slug
          ),
          location_images (
            id,
            url,
            sort_order
          )
        `,
      )
      .eq('published', true)
      .eq('slug', publicSlug)
      .single()

    if (fallback.error) {
      if (fallback.error.code === 'PGRST116') {
        return null
      }

      throw new Error(fallback.error.message)
    }

    const fallbackRow = fallback.data as LocationRow
    const fallbackImages = sortImages(fallbackRow.location_images)
      .filter((image) => Boolean(image.url))
      .map((image) => ({
        id: image.id ?? (image.url as string),
        url: image.url as string,
        sortOrder: image.sort_order ?? null,
      }))
    const fallbackCategory = getSingleRelation(fallbackRow.categories)
    const fallbackSlug = buildPublicSlug(fallbackRow.location_code) ?? publicSlug
    const fallbackLocationCode = fallbackRow.location_code?.trim() || fallbackSlug

    if (!fallbackCategory?.slug?.trim()) {
      throw new Error('La locacion no tiene una categoria publica asociada.')
    }

    return {
      id: fallbackRow.id,
      slug: fallbackSlug,
      title: fallbackLocationCode,
      description: fallbackRow.description?.trim() || null,
      locationCode: fallbackLocationCode,
      categorySlug: fallbackCategory.slug.trim(),
      departmentName: fallbackRow.departments?.name?.trim() || 'Sin departamento',
      zoneName: fallbackRow.zones?.name?.trim() || 'Sin zona',
      approxLat: parseApproxCoordinate(fallbackRow.approx_lat),
      approxLng: parseApproxCoordinate(fallbackRow.approx_lng),
      approxRadius: parseApproxRadius(fallbackRow.approx_radius),
      images: fallbackImages,
    } satisfies PublicLocationDetail
  }

  const row = data as LocationRow
  const images = sortImages(row.location_images)
    .filter((image) => Boolean(image.url))
    .map((image) => ({
      id: image.id ?? (image.url as string),
      url: image.url as string,
      sortOrder: image.sort_order ?? null,
    }))
  const category = getSingleRelation(row.categories)
  const normalizedSlug = buildPublicSlug(row.location_code) ?? publicSlug
  const publicLocationCode = row.location_code?.trim() || normalizedSlug

  if (!category?.slug?.trim()) {
    throw new Error('La locacion no tiene una categoria publica asociada.')
  }

  return {
    id: row.id,
    slug: normalizedSlug,
    title: publicLocationCode,
    description: row.description?.trim() || null,
    locationCode: publicLocationCode,
    categorySlug: category.slug.trim(),
    departmentName: row.departments?.name?.trim() || 'Sin departamento',
    zoneName: row.zones?.name?.trim() || 'Sin zona',
    approxLat: parseApproxCoordinate(row.approx_lat),
    approxLng: parseApproxCoordinate(row.approx_lng),
    approxRadius: parseApproxRadius(row.approx_radius),
    images,
  } satisfies PublicLocationDetail
}

export async function getFeaturedLocations() {
  throw new Error('getFeaturedLocations() pendiente de implementación en el siguiente paso.')
}

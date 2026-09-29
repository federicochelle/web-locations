import { supabase } from '@/lib/supabase.ts'
import { reportOperationalError } from '@/sentry-observability.ts'
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

export type SearchPublicLocationsRow = {
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
  total_count?: number | null
}

type PublicLocationsByCategoryRow = {
  id: string
  location_code?: string | null
  category_slug?: string | null
  department_name?: string | null
  cover_image_url?: string | null
  cover_image_alt?: string | null
  total_count?: number | string | null
}

export type ActiveCategory = {
  name: string
  slug: string
}

export type GetLocationsResult = {
  locations: PublicLocationCard[]
  activeCategory: ActiveCategory | null
  categoryExists: boolean
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

type GetLocationsFilters = {
  categorySlug?: string | null
  departmentSlug?: string | null
  page?: number
  pageSize?: number
  search?: string | null
  featureSlugs?: string[]
  useCategoryOrdering?: boolean
}

type GetLocationsFromRpcResult = {
  locations: PublicLocationCard[]
  totalCount: number
}

export const CATEGORY_LOCATIONS_PAGE_SIZE = 32
const DEFAULT_LOCATIONS_PAGE_SIZE = 20
const PUBLIC_LOCATION_DETAIL_SELECT = `
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
`
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type PublicLocationDetailLookupMode = 'id' | 'location_code' | 'slug'

export type PublicLocationDetailLookupResult = {
  location: PublicLocationDetail
  lookupMode: PublicLocationDetailLookupMode
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

function isUuid(value: string) {
  return UUID_PATTERN.test(value.trim())
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

function mapLocationDetailRow(
  row: LocationRow,
  fallbackSlug: string | null,
): PublicLocationDetail {
  const images = sortImages(row.location_images)
    .filter((image) => Boolean(image.url))
    .map((image) => ({
      id: image.id ?? (image.url as string),
      url: image.url as string,
      sortOrder: image.sort_order ?? null,
    }))
  const category = getSingleRelation(row.categories)
  const normalizedSlug = buildPublicSlug(row.location_code) ?? fallbackSlug ?? row.id
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
  }
}

export function mapSearchPublicLocationsRow(
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

function mapPublicLocationsByCategoryRow(
  row: PublicLocationsByCategoryRow,
): PublicLocationCard {
  return mapPublicLocationCard({
    id: row.id,
    locationCode: row.location_code ?? row.id,
    categorySlug: row.category_slug ?? null,
    departmentName: row.department_name ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    coverImageAlt: row.cover_image_alt ?? 'Imagen de locacion',
    features: [],
  })
}

function parseTotalCount(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number.parseInt(value, 10)
    return Number.isFinite(parsedValue) ? parsedValue : 0
  }

  return 0
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

export async function enrichLocationsWithCategorySlugs(
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
    reportOperationalError(error, {
      action: 'locations.enrich_categories',
      table: 'categories',
      errorCode: error.code,
      extra: {
        categoryCount: categoryNames.length,
      },
    })
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

async function getLocationsByCategoryFromRpc({
  categorySlug,
  departmentSlug,
  limit,
  offset,
}: {
  categorySlug: string
  departmentSlug: string | null
  limit: number
  offset: number
}): Promise<GetLocationsFromRpcResult> {
  const { data, error } = await supabase.rpc('get_public_locations_by_category', {
    p_category_slug: categorySlug,
    p_department_slug: departmentSlug,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    reportOperationalError(error, {
      action: 'locations.get_public_locations_by_category',
      rpc: 'get_public_locations_by_category',
      errorCode: error.code,
      extra: {
        categorySlug,
        departmentSlug,
        limit,
        offset,
      },
    })
    throw new Error(error.message)
  }

  const rows = (data ?? []) as PublicLocationsByCategoryRow[]

  return {
    locations: rows.map((row) => mapPublicLocationsByCategoryRow(row)),
    totalCount: parseTotalCount(rows[0]?.total_count),
  }
}

async function getLocationsFromLegacyRpc({
  categorySlug,
  departmentSlug,
  limit,
  offset,
  query,
  featureSlugs,
  tagSlugs,
}: {
  categorySlug: string | null
  departmentSlug: string | null
  limit: number
  offset: number
  query: string | null
  featureSlugs: string[]
  tagSlugs: string[]
}): Promise<GetLocationsFromRpcResult> {
  const { data, error } = await supabase.rpc('search_public_locations_v2', {
    p_query: query,
    p_category_slug: categorySlug,
    p_department_slug: departmentSlug,
    p_feature_slugs: featureSlugs,
    p_tag_slugs: tagSlugs,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) {
    reportOperationalError(error, {
      action: 'locations.search_public_locations_v2',
      rpc: 'search_public_locations_v2',
      errorCode: error.code,
      extra: {
        categorySlug,
        departmentSlug,
        hasQuery: Boolean(query),
        featureCount: featureSlugs.length,
        tagCount: tagSlugs.length,
        limit,
        offset,
      },
    })
    throw new Error(error.message)
  }

  const rowsWithCategorySlugs = await enrichLocationsWithCategorySlugs(
    (data ?? []) as SearchPublicLocationsRow[],
    categorySlug,
  )

  return {
    locations: rowsWithCategorySlugs.map((row) =>
      mapSearchPublicLocationsRow(row),
    ),
    totalCount: rowsWithCategorySlugs[0]?.total_count ?? 0,
  }
}

export async function getLocations(
  filters: GetLocationsFilters = {},
): Promise<GetLocationsResult> {
  const categorySlug = filters.categorySlug?.trim() ?? null
  const departmentSlug = filters.departmentSlug?.trim() ?? null
  const page = Math.max(1, Math.trunc(filters.page ?? 1))
  const pageSize = Math.max(1, Math.trunc(filters.pageSize ?? DEFAULT_LOCATIONS_PAGE_SIZE))
  const normalizedSearch = filters.search?.trim() ?? ''
  const normalizedFeatureSlugs = normalizeFeatureSlugs(filters.featureSlugs)
  const shouldUseCategoryOrdering = filters.useCategoryOrdering === true
  const offset = (page - 1) * pageSize
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
          page,
          pageSize,
          totalCount: 0,
          totalPages: 0,
        }
      }

      reportOperationalError(categoryError, {
        action: 'locations.category_lookup',
        table: 'categories',
        errorCode: categoryError.code,
        extra: {
          categorySlug,
        },
      })
      throw new Error(categoryError.message)
    }

    const resolvedCategory = category satisfies CategoryLookupRow
    activeCategory = {
      name: resolvedCategory.name ?? 'Categoria sin nombre',
      slug: resolvedCategory.slug ?? categorySlug,
    }
  }

  let rpcResult: GetLocationsFromRpcResult

  if (categorySlug && shouldUseCategoryOrdering && !normalizedSearch) {
    try {
      rpcResult = await getLocationsByCategoryFromRpc({
        categorySlug,
        departmentSlug,
        limit: pageSize,
        offset,
      })
    } catch {
      rpcResult = await getLocationsFromLegacyRpc({
        categorySlug,
        departmentSlug,
        limit: pageSize,
        offset,
        query: null,
        featureSlugs: [],
        tagSlugs: [],
      })
    }
  } else {
    rpcResult = await getLocationsFromLegacyRpc({
      categorySlug,
      departmentSlug,
      limit: pageSize,
      offset,
      query: normalizedSearch || null,
      featureSlugs: normalizedFeatureSlugs,
      tagSlugs: [],
    })
  }

  return {
    locations: rpcResult.locations,
    activeCategory,
    categoryExists: true,
    page,
    pageSize,
    totalCount: rpcResult.totalCount,
    totalPages:
      rpcResult.totalCount > 0
        ? Math.ceil(rpcResult.totalCount / pageSize)
        : 0,
  }
}

export async function getPublicLocationByIdentifier(
  publicIdentifier: string,
): Promise<PublicLocationDetailLookupResult | null> {
  const normalizedIdentifier = publicIdentifier.trim()

  if (!normalizedIdentifier) {
    return null
  }

  if (isUuid(normalizedIdentifier)) {
    const { data, error } = await supabase
      .from('locations')
      .select(PUBLIC_LOCATION_DETAIL_SELECT)
      .eq('published', true)
      .eq('id', normalizedIdentifier)
      .maybeSingle()

    if (error) {
      reportOperationalError(error, {
        action: 'locations.detail_by_id',
        table: 'locations',
        errorCode: error.code,
        extra: {
          publicIdentifier: normalizedIdentifier,
          lookup: 'id',
        },
      })
      throw new Error(error.message)
    }

    return data
      ? {
          location: mapLocationDetailRow(data as LocationRow, null),
          lookupMode: 'id',
        }
      : null
  }

  const locationCode = buildLocationCodeFromSlug(normalizedIdentifier)

  if (locationCode) {
    const { data, error } = await supabase
      .from('locations')
      .select(PUBLIC_LOCATION_DETAIL_SELECT)
      .eq('published', true)
      .eq('location_code', locationCode)
      .maybeSingle()

    if (error) {
      reportOperationalError(error, {
        action: 'locations.detail_by_code',
        table: 'locations',
        errorCode: error.code,
        extra: {
          publicIdentifier: normalizedIdentifier,
          lookup: 'location_code',
        },
      })
      throw new Error(error.message)
    }

    if (data) {
      return {
        location: mapLocationDetailRow(data as LocationRow, normalizedIdentifier),
        lookupMode: 'location_code',
      }
    }
  }

  const fallback = await supabase
    .from('locations')
    .select(PUBLIC_LOCATION_DETAIL_SELECT)
    .eq('published', true)
    .eq('slug', normalizedIdentifier)
    .maybeSingle()

  if (fallback.error) {
    reportOperationalError(fallback.error, {
      action: 'locations.detail_by_slug',
      table: 'locations',
      errorCode: fallback.error.code,
      extra: {
        publicIdentifier: normalizedIdentifier,
        lookup: 'slug',
      },
    })
    throw new Error(fallback.error.message)
  }

  return fallback.data
    ? {
        location: mapLocationDetailRow(fallback.data as LocationRow, normalizedIdentifier),
        lookupMode: 'slug',
      }
    : null
}

export async function getFeaturedLocations() {
  throw new Error('getFeaturedLocations() pendiente de implementación en el siguiente paso.')
}

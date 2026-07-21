import { supabase } from '@/lib/supabase.ts'
import { getSession, getSessionUser } from '@/services/auth.service.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import type {
  RequestProject,
  RequestProjectLocation,
  RequestProjectStatus,
} from '@/types/request-project.ts'
import { mapPublicLocationCard } from '@/utils/location-public.ts'

type RequestProjectLocationRow = {
  id?: string | null
  location_id?: string | null
  sort_order?: number | null
  created_at?: string | null
  location_code_snapshot?: string | null
  location_title_snapshot?: string | null
  category_slug_snapshot?: string | null
  cover_image_url_snapshot?: string | null
  request_project_location_images?: RequestProjectSelectionImageRow[] | null
  locations?: RequestProjectLocationLocationRow | RequestProjectLocationLocationRow[] | null
}

type RequestProjectRow = {
  id: string
  title?: string | null
  message?: string | null
  status?: RequestProjectStatus | null
  tentative_start_date?: string | null
  tentative_end_date?: string | null
  created_at?: string | null
  updated_at?: string | null
  request_project_locations?: RequestProjectLocationRow[] | null
}

type RelatedNameRow =
  | {
      name?: string | null
      slug?: string | null
    }
  | {
      name?: string | null
      slug?: string | null
    }[]
  | null

type LocationCatalogImageRow = {
  url?: string | null
  sort_order?: number | null
  is_cover?: boolean | null
}

type RequestProjectSelectionImageRow = {
  id: string
  location_image_id?: string | null
  sort_order?: number | null
  image_url_snapshot?: string | null
  created_at?: string | null
}

type RequestProjectLocationLocationRow = {
  id: string
  title?: string | null
  location_code?: string | null
  published?: boolean | null
  categories?: RelatedNameRow
  departments?: RelatedNameRow
  zones?: RelatedNameRow
  location_images?: LocationCatalogImageRow[] | null
}

type RequestProjectLocationRelationRow = {
  id: string
  notes?: string | null
  sort_order?: number | null
  created_at?: string | null
  location_id?: string | null
  location_code_snapshot?: string | null
  location_title_snapshot?: string | null
  category_slug_snapshot?: string | null
  cover_image_url_snapshot?: string | null
  request_project_location_images?: RequestProjectSelectionImageRow[] | null
  locations?:
    | RequestProjectLocationLocationRow
    | RequestProjectLocationLocationRow[]
    | null
}

type CreateRequestProjectInput = {
  title: string
  message: string | null
  tentativeStartDate?: string | null
  tentativeEndDate?: string | null
}

type UpdateRequestProjectInput = {
  title: string
  message: string | null
  tentativeStartDate: string | null
  tentativeEndDate: string | null
}

type AddLocationToRequestProjectResult = 'added' | 'exists'

const REQUEST_PROJECT_SELECT = `
  id,
  title,
  message,
  status,
  tentative_start_date,
  tentative_end_date,
  created_at,
  updated_at,
  request_project_locations (
    id,
    location_id,
    sort_order,
    created_at,
    location_code_snapshot,
    location_title_snapshot,
    category_slug_snapshot,
    cover_image_url_snapshot,
    request_project_location_images (
      id,
      location_image_id,
      sort_order,
      image_url_snapshot,
      created_at
    ),
    locations (
      id,
      title,
      location_code,
      published,
      categories (
        name,
        slug
      ),
      departments (
        name
      ),
      zones (
        name
      ),
      location_images (
        url,
        sort_order,
        is_cover
      )
    )
  )
`

function sortProjectLocationRows(rows: RequestProjectLocationRow[] | null | undefined) {
  return [...(rows ?? [])].sort((left, right) => {
    const leftSortOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER
    const rightSortOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder
    }

    return (left.created_at ?? '').localeCompare(right.created_at ?? '')
  })
}

function mapRequestProjectErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('row-level security')
  ) {
    return 'No tienes permisos para completar esta accion.'
  }

  if (normalizedMessage.includes('violates check constraint')) {
    return 'El proyecto no cumple con las validaciones requeridas.'
  }

  if (normalizedMessage.includes('not found')) {
    return 'No encontramos la solicitud indicada.'
  }

  return 'No pudimos completar la solicitud. Intenta nuevamente.'
}

function getRelatedName(value: RelatedNameRow | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null
  }

  return value?.name ?? null
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function sortImages(images: LocationCatalogImageRow[] | null | undefined) {
  return [...(images ?? [])].sort((left, right) => {
    const leftCoverOrder = left.is_cover ? -1 : 0
    const rightCoverOrder = right.is_cover ? -1 : 0

    if (leftCoverOrder !== rightCoverOrder) {
      return leftCoverOrder - rightCoverOrder
    }

    return (
      (left.sort_order ?? Number.MAX_SAFE_INTEGER) -
      (right.sort_order ?? Number.MAX_SAFE_INTEGER)
    )
  })
}

function sortPersistedSelectionImages(
  images: RequestProjectSelectionImageRow[] | null | undefined,
) {
  return [...(images ?? [])].sort((left, right) => {
    const leftSortOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER
    const rightSortOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder
    }

    return (left.created_at ?? '').localeCompare(right.created_at ?? '')
  })
}

function mapRequestProject(row: RequestProjectRow): RequestProject {
  const firstLocationRow = sortProjectLocationRows(row.request_project_locations)[0] ?? null
  const firstLocation = getSingleRelation(firstLocationRow?.locations)
  const firstSelectedImage = sortPersistedSelectionImages(
    firstLocationRow?.request_project_location_images,
  ).find((image) => Boolean(image.image_url_snapshot))
  const firstLocationCoverImage = sortImages(firstLocation?.location_images).find((image) =>
    Boolean(image.url),
  )
  const firstLocationCode =
    firstLocationRow?.location_code_snapshot?.trim() ||
    firstLocation?.location_code?.trim() ||
    firstLocation?.id
  const firstLocationCategorySlug =
    firstLocationRow?.category_slug_snapshot?.trim() ||
    (getSingleRelation(firstLocation?.categories)?.slug ?? null)
  const firstLocationCard = firstLocation
    ? mapPublicLocationCard({
        id: firstLocation.id,
        locationCode: firstLocationCode,
        categorySlug: firstLocationCategorySlug,
        categoryName: getRelatedName(firstLocation.categories),
        departmentName: getRelatedName(firstLocation.departments),
        zoneName: getRelatedName(firstLocation.zones),
        coverImageUrl:
          firstSelectedImage?.image_url_snapshot ??
          firstLocationRow?.cover_image_url_snapshot ??
          firstLocationCoverImage?.url ??
          null,
        coverImageAlt: 'Imagen de locacion',
        features: [],
      })
    : null

  return {
    id: row.id,
    title: row.title?.trim() || 'Solicitud sin titulo',
    message: row.message?.trim() || null,
    status: row.status ?? 'draft',
    tentativeStartDate: row.tentative_start_date ?? null,
    tentativeEndDate: row.tentative_end_date ?? null,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
    locationCount: row.request_project_locations?.length ?? 0,
    firstLocation: firstLocationCard
      ? {
          title: firstLocationCard.title,
          coverImageUrl: firstLocationCard.coverImageUrl,
        }
      : null,
  }
}

function mapRequestProjectLocation(
  row: RequestProjectLocationRelationRow,
): RequestProjectLocation | null {
  const location = getSingleRelation(row.locations)

  if (!location) {
    return null
  }

  const coverImage = sortImages(location.location_images).find((image) =>
    Boolean(image.url),
  )
  const locationCode =
    row.location_code_snapshot?.trim() ||
    location.location_code ||
    location.id
  const locationTitle =
    row.location_title_snapshot?.trim() ||
    location.title?.trim() ||
    locationCode
  const categorySlug =
    row.category_slug_snapshot?.trim() ||
    (getSingleRelation(location.categories)?.slug ?? null)
  const coverImageUrl =
    row.cover_image_url_snapshot?.trim() ||
    (coverImage?.url ?? null)

  const locationCard = mapPublicLocationCard({
    id: location.id,
    locationCode,
    categorySlug,
    categoryName: getRelatedName(location.categories),
    departmentName: getRelatedName(location.departments),
    zoneName: getRelatedName(location.zones),
    coverImageUrl,
    coverImageAlt: 'Imagen de locacion',
    features: [],
  })

  const selectedImages = sortPersistedSelectionImages(
    row.request_project_location_images,
  )
    .filter((image) => Boolean(image.image_url_snapshot))
    .map((image) => ({
      id: image.id,
      locationImageId: image.location_image_id ?? null,
      imageUrl: image.image_url_snapshot ?? '',
      sortOrder: image.sort_order ?? null,
      createdAt: image.created_at ?? row.created_at ?? new Date(0).toISOString(),
    }))

  return {
    id: row.id,
    notes: row.notes?.trim() || null,
    sortOrder: row.sort_order ?? null,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    selectedImages,
    location: {
      id: locationCard.id,
      slug: locationCard.slug,
      title: locationTitle,
      locationCode: locationCard.locationCode,
      categorySlug: locationCard.categorySlug,
      categoryName: locationCard.categoryName,
      departmentName: locationCard.departmentName,
      zoneName: locationCard.zoneName,
      coverImageUrl: locationCard.coverImageUrl,
      coverImageAlt: locationCard.coverImageAlt,
    },
  }
}

export function getRequestProjectErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return mapRequestProjectErrorMessage(error.message)
  }

  return 'No pudimos completar la solicitud. Intenta nuevamente.'
}

async function getCurrentUserId() {
  const { session } = await getSession()
  const user = getSessionUser(session)

  if (!user) {
    throw new Error('Debes iniciar sesion para gestionar solicitudes.')
  }

  return user.id
}

export async function getMyRequestProjects() {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('request_projects')
    .select(REQUEST_PROJECT_SELECT)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as RequestProjectRow[]).map((row) => mapRequestProject(row))
}

export async function getMyDraftRequestProjects() {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('request_projects')
    .select(REQUEST_PROJECT_SELECT)
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as RequestProjectRow[]).map((row) => mapRequestProject(row))
}

export async function getRequestProjectById(id: string) {
  await getCurrentUserId()

  const { data, error } = await supabase
    .from('request_projects')
    .select(REQUEST_PROJECT_SELECT)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(error.message)
  }

  return mapRequestProject(data as RequestProjectRow)
}

export async function createRequestProject({
  title,
  message,
  tentativeStartDate = null,
  tentativeEndDate = null,
}: CreateRequestProjectInput) {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('request_projects')
    .insert({
      user_id: userId,
      title: title.trim(),
      message: message?.trim() || null,
      tentative_start_date: tentativeStartDate,
      tentative_end_date: tentativeEndDate,
    })
    .select(REQUEST_PROJECT_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapRequestProject(data as RequestProjectRow)
}

export async function updateRequestProject(
  id: string,
  {
    title,
    message,
    tentativeStartDate,
    tentativeEndDate,
  }: UpdateRequestProjectInput,
) {
  const { data, error } = await supabase
    .from('request_projects')
    .update({
      title: title.trim(),
      message: message?.trim() || null,
      tentative_start_date: tentativeStartDate,
      tentative_end_date: tentativeEndDate,
    })
    .eq('id', id)
    .select(REQUEST_PROJECT_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapRequestProject(data as RequestProjectRow)
}

export async function submitRequestProject(id: string) {
  const { data, error } = await supabase
    .from('request_projects')
    .update({
      status: 'submitted',
    })
    .eq('id', id)
    .select(REQUEST_PROJECT_SELECT)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return mapRequestProject(data as RequestProjectRow)
}

export async function deleteRequestProject(id: string) {
  await getCurrentUserId()

  const { error } = await supabase
    .from('request_projects')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getRequestProjectLocations(projectId: string) {
  await getCurrentUserId()

  const { data, error } = await supabase
    .from('request_project_locations')
    .select(
      `
        id,
        notes,
        sort_order,
        created_at,
        location_id,
        location_code_snapshot,
        location_title_snapshot,
        category_slug_snapshot,
        cover_image_url_snapshot,
        request_project_location_images (
          id,
          location_image_id,
          sort_order,
          image_url_snapshot,
          created_at
        ),
        locations!inner (
          id,
          title,
          location_code,
          published,
          categories (
            name,
            slug
          ),
          departments (
            name
          ),
          zones (
            name
          ),
          location_images (
            url,
            sort_order,
            is_cover
          )
        )
      `,
    )
    .eq('request_project_id', projectId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as RequestProjectLocationRelationRow[])
    .map((row) => mapRequestProjectLocation(row))
    .filter((location): location is RequestProjectLocation => Boolean(location))
}

export async function addLocationToRequestProject(
  projectId: string,
  locationId: string,
): Promise<AddLocationToRequestProjectResult> {
  const { error } = await supabase.from('request_project_locations').insert({
    request_project_id: projectId,
    location_id: locationId,
  })

  if (error) {
    if (error.code === '23505') {
      return 'exists'
    }

    throw new Error(error.message)
  }

  return 'added'
}

function sortSelectedImages(images: SelectedLocationImage[]) {
  return [...images].sort((left, right) => {
    const leftSortOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER
    const rightSortOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER

    if (leftSortOrder !== rightSortOrder) {
      return leftSortOrder - rightSortOrder
    }

    return left.selectedAt.localeCompare(right.selectedAt)
  })
}

function groupSelectionImagesByLocation(images: SelectedLocationImage[]) {
  const groupedImages = new Map<
    string,
    {
      locationId: string
      locationCode: string
      locationTitle: string
      categorySlug: string
      images: SelectedLocationImage[]
    }
  >()

  for (const image of sortSelectedImages(images)) {
    const existingGroup = groupedImages.get(image.locationId)

    if (existingGroup) {
      existingGroup.images.push(image)
      continue
    }

    groupedImages.set(image.locationId, {
      locationId: image.locationId,
      locationCode: image.locationCode,
      locationTitle: image.locationTitle,
      categorySlug: image.categorySlug,
      images: [image],
    })
  }

  return [...groupedImages.values()]
}

export async function syncRequestProjectSelection(
  projectId: string,
  images: SelectedLocationImage[],
) {
  await getCurrentUserId()

  const groupedLocations = groupSelectionImagesByLocation(images)
  const selectedLocationIds = groupedLocations.map((location) => location.locationId)

  const { data: existingLocations, error: existingLocationsError } = await supabase
    .from('request_project_locations')
    .select('id, location_id')
    .eq('request_project_id', projectId)

  if (existingLocationsError) {
    throw new Error(existingLocationsError.message)
  }

  const existingLocationRows = (existingLocations ?? []) as {
    id: string
    location_id: string | null
  }[]

  const locationIdsToRemove = existingLocationRows
    .map((row) => row.location_id)
    .filter((locationId): locationId is string => Boolean(locationId))
    .filter((locationId) => !selectedLocationIds.includes(locationId))

  if (locationIdsToRemove.length > 0) {
    const { error: removeLocationsError } = await supabase
      .from('request_project_locations')
      .delete()
      .eq('request_project_id', projectId)
      .in('location_id', locationIdsToRemove)

    if (removeLocationsError) {
      throw new Error(removeLocationsError.message)
    }
  }

  if (groupedLocations.length === 0) {
    return
  }

  const { error: upsertLocationsError } = await supabase
    .from('request_project_locations')
    .upsert(
      groupedLocations.map((location, index) => ({
        request_project_id: projectId,
        location_id: location.locationId,
        sort_order: index,
        location_code_snapshot: location.locationCode,
        location_title_snapshot: location.locationTitle,
        category_slug_snapshot: location.categorySlug || null,
        cover_image_url_snapshot: location.images[0]?.imageUrl ?? null,
      })),
      {
        onConflict: 'request_project_id,location_id',
      },
    )

  if (upsertLocationsError) {
    throw new Error(upsertLocationsError.message)
  }

  const { data: syncedLocations, error: syncedLocationsError } = await supabase
    .from('request_project_locations')
    .select('id, location_id')
    .eq('request_project_id', projectId)
    .in('location_id', selectedLocationIds)

  if (syncedLocationsError) {
    throw new Error(syncedLocationsError.message)
  }

  const requestProjectLocationIdByLocationId = new Map<string, string>()

  for (const row of (syncedLocations ?? []) as { id: string; location_id: string | null }[]) {
    if (!row.location_id) {
      continue
    }

    requestProjectLocationIdByLocationId.set(row.location_id, row.id)
  }

  const requestProjectLocationIds = [...requestProjectLocationIdByLocationId.values()]

  if (requestProjectLocationIds.length > 0) {
    const { error: deleteImagesError } = await supabase
      .from('request_project_location_images')
      .delete()
      .in('request_project_location_id', requestProjectLocationIds)

    if (deleteImagesError) {
      throw new Error(deleteImagesError.message)
    }
  }

  const nextProjectImages = groupedLocations.flatMap((location) => {
    const requestProjectLocationId = requestProjectLocationIdByLocationId.get(location.locationId)

    if (!requestProjectLocationId) {
      return []
    }

    return location.images.map((image, index) => ({
      request_project_location_id: requestProjectLocationId,
      location_image_id: image.locationImageId ?? null,
      sort_order: index,
      image_url_snapshot: image.imageUrl,
    }))
  })

  if (nextProjectImages.length === 0) {
    return
  }

  const { error: insertImagesError } = await supabase
    .from('request_project_location_images')
    .insert(nextProjectImages)

  if (insertImagesError) {
    throw new Error(insertImagesError.message)
  }
}

export async function removeLocationFromRequestProject(
  projectId: string,
  locationId: string,
) {
  const { error } = await supabase
    .from('request_project_locations')
    .delete()
    .eq('request_project_id', projectId)
    .eq('location_id', locationId)

  if (error) {
    throw new Error(error.message)
  }
}

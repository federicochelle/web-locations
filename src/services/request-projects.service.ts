import { supabase } from '@/lib/supabase.ts'
import { getSession, getSessionUser } from '@/services/auth.service.ts'
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
  locations?: RequestProjectLocationLocationRow | RequestProjectLocationLocationRow[] | null
}

type RequestProjectRow = {
  id: string
  title?: string | null
  message?: string | null
  status?: RequestProjectStatus | null
  created_at?: string | null
  updated_at?: string | null
  request_project_locations?: RequestProjectLocationRow[] | null
}

type RelatedNameRow =
  | {
      name?: string | null
    }
  | {
      name?: string | null
    }[]
  | null

type RequestProjectLocationImageRow = {
  url?: string | null
  sort_order?: number | null
  is_cover?: boolean | null
}

type RequestProjectLocationLocationRow = {
  id: string
  location_code?: string | null
  published?: boolean | null
  categories?: RelatedNameRow
  departments?: RelatedNameRow
  zones?: RelatedNameRow
  location_images?: RequestProjectLocationImageRow[] | null
}

type RequestProjectLocationRelationRow = {
  id: string
  notes?: string | null
  sort_order?: number | null
  created_at?: string | null
  locations?:
    | RequestProjectLocationLocationRow
    | RequestProjectLocationLocationRow[]
    | null
}

type CreateRequestProjectInput = {
  title: string
  message: string | null
}

type UpdateRequestProjectInput = {
  title: string
  message: string | null
}

type AddLocationToRequestProjectResult = 'added' | 'exists'

const REQUEST_PROJECT_SELECT = `
  id,
  title,
  message,
  status,
  created_at,
  updated_at,
  request_project_locations (
    id,
    location_id,
    sort_order,
    created_at,
    locations (
      id,
      location_code,
      published,
      categories (
        name
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

function sortImages(images: RequestProjectLocationImageRow[] | null | undefined) {
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

function mapRequestProject(row: RequestProjectRow): RequestProject {
  const firstLocationRow = sortProjectLocationRows(row.request_project_locations)[0] ?? null
  const firstLocation = getSingleRelation(firstLocationRow?.locations)
  const firstLocationCoverImage = sortImages(firstLocation?.location_images).find((image) =>
    Boolean(image.url),
  )
  const firstLocationCard = firstLocation
    ? mapPublicLocationCard({
        id: firstLocation.id,
        locationCode: firstLocation.location_code ?? firstLocation.id,
        categoryName: getRelatedName(firstLocation.categories),
        departmentName: getRelatedName(firstLocation.departments),
        zoneName: getRelatedName(firstLocation.zones),
        coverImageUrl: firstLocationCoverImage?.url ?? null,
        coverImageAlt: 'Imagen de locacion',
        features: [],
      })
    : null

  return {
    id: row.id,
    title: row.title?.trim() || 'Solicitud sin titulo',
    message: row.message?.trim() || null,
    status: row.status ?? 'draft',
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

  if (!location || location.published === false) {
    return null
  }

  const coverImage = sortImages(location.location_images).find((image) =>
    Boolean(image.url),
  )

  const locationCard = mapPublicLocationCard({
    id: location.id,
    locationCode: location.location_code ?? location.id,
    categoryName: getRelatedName(location.categories),
    departmentName: getRelatedName(location.departments),
    zoneName: getRelatedName(location.zones),
    coverImageUrl: coverImage?.url ?? null,
    coverImageAlt: 'Imagen de locacion',
    features: [],
  })

  return {
    id: row.id,
    notes: row.notes?.trim() || null,
    sortOrder: row.sort_order ?? null,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    location: {
      id: locationCard.id,
      slug: locationCard.slug,
      title: locationCard.title,
      locationCode: locationCard.locationCode,
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
}: CreateRequestProjectInput) {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('request_projects')
    .insert({
      user_id: userId,
      title: title.trim(),
      message: message?.trim() || null,
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
  { title, message }: UpdateRequestProjectInput,
) {
  const { data, error } = await supabase
    .from('request_projects')
    .update({
      title: title.trim(),
      message: message?.trim() || null,
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
        locations!inner (
          id,
          location_code,
          published,
          categories (
            name
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

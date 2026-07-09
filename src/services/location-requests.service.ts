import { supabase } from '@/lib/supabase.ts'
import { getSession, getSessionUser } from '@/services/auth.service.ts'
import type { MyLocationRequest } from '@/types/location.ts'
import { buildPublicSlug } from '@/utils/location-public.ts'

type LocationRequestImageRow = {
  url?: string | null
  is_cover?: boolean | null
  sort_order?: number | null
}

type LocationRequestLocationRow = {
  id: string
  title?: string | null
  location_code?: string | null
  categories?:
    | {
        name?: string | null
      }
    | {
        name?: string | null
      }[]
    | null
  location_images?: LocationRequestImageRow[] | null
}

type LocationRequestRow = {
  id: string
  created_at?: string | null
  status?: MyLocationRequest['status'] | null
  message?: string | null
  locations?: LocationRequestLocationRow | LocationRequestLocationRow[] | null
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function sortLocationImages(images: LocationRequestImageRow[] | null | undefined) {
  return [...(images ?? [])].sort((left, right) => {
    if (Boolean(left.is_cover) !== Boolean(right.is_cover)) {
      return left.is_cover ? -1 : 1
    }

    return (
      (left.sort_order ?? Number.MAX_SAFE_INTEGER) -
      (right.sort_order ?? Number.MAX_SAFE_INTEGER)
    )
  })
}

function mapLocationRequest(row: LocationRequestRow): MyLocationRequest {
  const location = getSingleRelation(row.locations)

  if (!location) {
    throw new Error('La solicitud no tiene una locacion asociada.')
  }

  const category = getSingleRelation(location.categories)
  const locationCode = location.location_code?.trim() || location.title?.trim() || location.id
  const coverImage = sortLocationImages(location.location_images).find((image) =>
    Boolean(image.url),
  )

  return {
    id: row.id,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    status: row.status ?? 'pending',
    message: row.message?.trim() || '',
    location: {
      id: location.id,
      slug: buildPublicSlug(location.location_code) ?? location.id,
      title: location.title?.trim() || locationCode,
      locationCode,
      categoryName: category?.name?.trim() || 'Sin categoria',
      coverImageUrl: coverImage?.url ?? null,
    },
  }
}

function mapLocationRequestErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('row-level security')
  ) {
    return 'No tienes permisos para completar esta accion.'
  }

  if (normalizedMessage.includes('violates check constraint')) {
    return 'El mensaje no cumple con las validaciones requeridas.'
  }

  return 'No pudimos completar la solicitud. Intenta nuevamente.'
}

export function getLocationRequestErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return mapLocationRequestErrorMessage(error.message)
  }

  return 'No pudimos completar la solicitud. Intenta nuevamente.'
}

export async function createLocationRequest(locationId: string, message: string) {
  const { session } = await getSession()
  const user = getSessionUser(session)

  if (!user) {
    throw new Error('Debes iniciar sesion para enviar una solicitud.')
  }

  const { error } = await supabase.from('location_requests').insert({
    user_id: user.id,
    location_id: locationId,
    message: message.trim(),
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getMyLocationRequests() {
  const { session } = await getSession()
  const user = getSessionUser(session)

  if (!user) {
    throw new Error('Debes iniciar sesion para ver tus solicitudes.')
  }

  const { data, error } = await supabase
    .from('location_requests')
    .select(
      `
        id,
        created_at,
        status,
        message,
        locations (
          id,
          title,
          location_code,
          categories (
            name
          ),
          location_images (
            url,
            is_cover,
            sort_order
          )
        )
      `,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as LocationRequestRow[]).map((row) => mapLocationRequest(row))
}

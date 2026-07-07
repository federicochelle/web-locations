import { supabase } from '@/lib/supabase.ts'
import { mapPublicLocationCard } from '@/utils/location-public.ts'
import type { PublicLocationCard } from '@/types/location.ts'

type FavoriteLocationImageRow = {
  url?: string | null
  sort_order?: number | null
  is_cover?: boolean | null
}

type FavoriteLocationRow = {
  id: string
  location_code?: string | null
  published?: boolean | null
  categories?:
    | {
        name?: string | null
      }
    | {
        name?: string | null
      }[]
    | null
  departments?:
    | {
        name?: string | null
      }
    | {
        name?: string | null
      }[]
    | null
  zones?:
    | {
        name?: string | null
      }
    | {
        name?: string | null
      }[]
    | null
  location_images?: FavoriteLocationImageRow[] | null
}

type FavoriteRow = {
  location_id: string
  locations?: FavoriteLocationRow | FavoriteLocationRow[] | null
}

function getRelatedName(
  value:
    | {
        name?: string | null
      }
    | {
        name?: string | null
      }[]
    | null
    | undefined,
) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? null
  }

  return value?.name ?? null
}

function getLocationRow(
  value: FavoriteLocationRow | FavoriteLocationRow[] | null | undefined,
) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

function sortImages(images: FavoriteLocationImageRow[] | null | undefined) {
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

function mapFavoriteRow(row: FavoriteRow): PublicLocationCard | null {
  const location = getLocationRow(row.locations)

  if (!location || location.published === false) {
    return null
  }

  const coverImage = sortImages(location.location_images).find((image) =>
    Boolean(image.url),
  )

  return mapPublicLocationCard({
    id: location.id,
    locationCode: location.location_code ?? location.id,
    categoryName: getRelatedName(location.categories),
    departmentName: getRelatedName(location.departments),
    zoneName: getRelatedName(location.zones),
    coverImageUrl: coverImage?.url ?? null,
    coverImageAlt: 'Imagen de locacion',
    features: [],
  })
}

export async function addFavorite(userId: string, locationId: string) {
  const { error } = await supabase.from('favorites').insert({
    user_id: userId,
    location_id: locationId,
  })

  if (error) {
    if (error.code === '23505') {
      return
    }

    throw new Error(error.message)
  }
}

export async function removeFavorite(userId: string, locationId: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('location_id', locationId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function isFavorite(userId: string, locationId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select('location_id')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return Boolean(data)
}

export async function getFavorites(userId: string): Promise<PublicLocationCard[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(
      `
        location_id,
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
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as FavoriteRow[])
    .map((row) => mapFavoriteRow(row))
    .filter((location): location is PublicLocationCard => Boolean(location))
}

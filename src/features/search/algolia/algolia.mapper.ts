import type { PublicLocationCard } from '@/types/location.ts'
import { buildPublicSlug } from '@/utils/location-public.ts'

import type { AlgoliaLocationHit } from '@/features/search/algolia/algolia.types.ts'

export function mapAlgoliaHitToPublicLocationCard(
  hit: AlgoliaLocationHit,
): PublicLocationCard {
  const locationCode =
    hit.location_code?.trim() || hit.slug?.trim() || hit.objectID
  const fallbackSlug =
    hit.slug?.trim() || buildPublicSlug(locationCode) || hit.objectID

  return {
    id: hit.objectID,
    slug: fallbackSlug,
    title: locationCode,
    locationCode,
    categorySlug: hit.category_slug?.trim() || null,
    categoryName: hit.category_name?.trim() || 'Sin categoria',
    departmentName: hit.department_name?.trim() || 'Sin departamento',
    zoneName: 'Sin zona',
    coverImageUrl: hit.cover_url?.trim() || null,
    coverImageAlt: hit.cover_alt_text?.trim() || 'Imagen de locacion',
    features: hit.features?.filter((feature): feature is string => feature.trim().length > 0) ?? [],
    matchedFeatureCount: undefined,
    selectedFeatureCount: undefined,
    featureMatchMode: null,
  }
}

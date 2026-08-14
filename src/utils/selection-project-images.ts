import { getRequestProjectLocations } from '@/services/request-projects.service.ts'
import type { SelectedLocationImage } from '@/types/image-selection.ts'
import type { RequestProjectLocation } from '@/types/request-project.ts'
import { getImageSelectionKey } from '@/utils/image-selection-key.ts'

function buildProjectFallbackImage(location: RequestProjectLocation): SelectedLocationImage {
  const imageUrl =
    location.location.coverImageUrl ??
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><rect width="1200" height="675" fill="#201712"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#F3E8D2" font-family="Georgia, serif" font-size="54">${location.location.locationCode}</text></svg>`,
    )}`

  return {
    key: getImageSelectionKey({
      locationId: location.location.id,
      imageUrl,
    }),
    imageUrl,
    locationImageId: null,
    sortOrder: location.sortOrder,
    locationId: location.location.id,
    locationCode: location.location.locationCode,
    locationTitle: location.location.title,
    categorySlug: location.location.categorySlug ?? '',
    selectedAt: location.createdAt,
  }
}

export function buildProjectSelectionImages(location: RequestProjectLocation): SelectedLocationImage[] {
  if (location.selectedImages.length === 0) {
    return [buildProjectFallbackImage(location)]
  }

  return location.selectedImages.map((image) => ({
    key: getImageSelectionKey({
      locationId: location.location.id,
      locationImageId: image.locationImageId,
      imageUrl: image.imageUrl,
    }),
    imageUrl: image.imageUrl,
    locationImageId: image.locationImageId,
    sortOrder: image.sortOrder,
    locationId: location.location.id,
    locationCode: location.location.locationCode,
    locationTitle: location.location.title,
    categorySlug: location.location.categorySlug ?? '',
    selectedAt: image.createdAt,
  }))
}

export async function fetchProjectSelectionImages(projectId: string) {
  const projectLocations = await getRequestProjectLocations(projectId)
  return projectLocations.flatMap((location) => buildProjectSelectionImages(location))
}

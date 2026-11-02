import type { SelectionPdfFailedImage, SelectionPdfPayload } from '@/types/selection-pdf.ts'

export type PdfFailedPhoto = {
  // 1-based position of the photo inside its location, in the order it was selected.
  position: number
  message: string
}

export type PdfFailedLocation = {
  locationCode: string
  totalPhotos: number
  failedPhotos: PdfFailedPhoto[]
  // Every photo of the location failed, so the location is left out of the PDF altogether.
  isLost: boolean
}

export type PdfFailedImagesSummary = {
  failedCount: number
  lostLocationCount: number
  locations: PdfFailedLocation[]
}

export type PdfFailedImagesDecision = 'retry' | 'continue' | 'cancel'

// Groups the photos that could not be included by location, in payload order.
export function summarizeFailedImages(
  payload: SelectionPdfPayload,
  failedImages: SelectionPdfFailedImage[],
): PdfFailedImagesSummary {
  const failedByKey = new Map(failedImages.map((failedImage) => [failedImage.key, failedImage]))
  const locations: PdfFailedLocation[] = []

  for (const location of payload.locations) {
    const failedPhotos: PdfFailedPhoto[] = []

    location.images.forEach((image, index) => {
      const failedImage = failedByKey.get(image.key)

      if (failedImage) {
        failedPhotos.push({ position: index + 1, message: failedImage.message })
      }
    })

    if (failedPhotos.length > 0) {
      locations.push({
        locationCode: location.locationCode,
        totalPhotos: location.images.length,
        failedPhotos,
        isLost: failedPhotos.length === location.images.length,
      })
    }
  }

  return {
    failedCount: locations.reduce((sum, location) => sum + location.failedPhotos.length, 0),
    lostLocationCount: locations.filter((location) => location.isLost).length,
    locations,
  }
}

import type { SelectedLocationImage } from '@/types/image-selection.ts'
import {
  getRequestProjectById,
  getRequestProjectLocations,
} from '@/services/request-projects.service.ts'
import type {
  RequestProject,
  RequestProjectLocation,
} from '@/types/request-project.ts'
import type {
  SelectionPdfFormErrors,
  SelectionPdfFormValues,
  SelectionPdfLocation,
  SelectionPdfPayload,
} from '@/types/selection-pdf.ts'

function normalizeValue(value: string) {
  return value.trim()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
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

export function validateSelectionPdfForm(
  values: SelectionPdfFormValues,
): SelectionPdfFormErrors {
  const nextErrors: SelectionPdfFormErrors = {}
  const normalizedValues = {
    product: normalizeValue(values.product),
    productionCompany: normalizeValue(values.productionCompany),
    locationManager: normalizeValue(values.locationManager),
    email: normalizeValue(values.email),
    tentativeStartDate: normalizeValue(values.tentativeStartDate),
    tentativeEndDate: normalizeValue(values.tentativeEndDate),
  }

  if (!normalizedValues.product) {
    nextErrors.product = 'Ingresa el producto.'
  }

  if (!normalizedValues.productionCompany) {
    nextErrors.productionCompany = 'Ingresa la productora.'
  }

  if (!normalizedValues.locationManager) {
    nextErrors.locationManager = 'Ingresa el jefe de locaciones.'
  }

  if (!normalizedValues.email) {
    nextErrors.email = 'Ingresa un email.'
  } else if (!isValidEmail(normalizedValues.email)) {
    nextErrors.email = 'Ingresa un email valido.'
  }

  if (
    normalizedValues.tentativeStartDate &&
    normalizedValues.tentativeEndDate &&
    normalizedValues.tentativeEndDate < normalizedValues.tentativeStartDate
  ) {
    nextErrors.tentativeEndDate =
      'La fecha hasta no puede ser anterior a la fecha desde.'
  }

  return nextErrors
}

export function buildRequestProjectMessageFromPdfForm(
  values: SelectionPdfFormValues,
) {
  return [
    `Empresa: ${normalizeValue(values.productionCompany)}`,
    `Location manager: ${normalizeValue(values.locationManager)}`,
    `Email: ${normalizeValue(values.email)}`,
  ].join('\n')
}

export function mapRequestProjectToPdfFormValues(
  project: RequestProject,
): SelectionPdfFormValues {
  const values: SelectionPdfFormValues = {
    product: project.title,
    productionCompany: '',
    locationManager: '',
    email: '',
    tentativeStartDate: project.tentativeStartDate ?? '',
    tentativeEndDate: project.tentativeEndDate ?? '',
  }

  const message = project.message ?? ''

  for (const rawLine of message.split('\n')) {
    const line = rawLine.trim()

    if (line.startsWith('Empresa:')) {
      values.productionCompany = line.slice('Empresa:'.length).trim()
      continue
    }

    if (line.startsWith('Location manager:')) {
      values.locationManager = line.slice('Location manager:'.length).trim()
      continue
    }

    if (line.startsWith('Email:')) {
      values.email = line.slice('Email:'.length).trim()
    }
  }

  return values
}

export function buildSelectionPdfPayloadFromImages(
  values: SelectionPdfFormValues,
  images: SelectedLocationImage[],
): SelectionPdfPayload {
  const sortedImages = sortSelectedImages(images)
  const groupedSelections = new Map<string, SelectionPdfLocation>()

  for (const image of sortedImages) {
    const existingGroup = groupedSelections.get(image.locationId)

    if (existingGroup) {
      existingGroup.images.push({
        key: image.key,
        imageUrl: image.imageUrl,
        sortOrder: image.sortOrder,
      })
      continue
    }

    groupedSelections.set(image.locationId, {
      locationId: image.locationId,
      locationCode: image.locationCode,
      locationTitle: image.locationTitle,
      categorySlug: image.categorySlug,
      images: [
        {
          key: image.key,
          imageUrl: image.imageUrl,
          sortOrder: image.sortOrder,
        },
      ],
    })
  }

  const locations = [...groupedSelections.values()]

  return {
    project: {
      product: normalizeValue(values.product),
      productionCompany: normalizeValue(values.productionCompany),
      locationManager: normalizeValue(values.locationManager),
      email: normalizeValue(values.email),
      tentativeStartDate: normalizeValue(values.tentativeStartDate),
      tentativeEndDate: normalizeValue(values.tentativeEndDate),
    },
    generatedAt: new Date().toISOString(),
    totalImages: images.length,
    totalLocations: locations.length,
    locations,
  }
}

export function buildSelectionPdfPayloadFromProject(
  projectId: string,
): Promise<SelectionPdfPayload>
export function buildSelectionPdfPayloadFromProject(
  values: SelectionPdfFormValues,
  locations: RequestProjectLocation[],
  generatedAt: string,
): SelectionPdfPayload
export function buildSelectionPdfPayloadFromProject(
  projectIdOrValues: string | SelectionPdfFormValues,
  locations?: RequestProjectLocation[],
  generatedAt?: string,
): Promise<SelectionPdfPayload> | SelectionPdfPayload {
  if (typeof projectIdOrValues === 'string') {
    return Promise.all([
      getRequestProjectById(projectIdOrValues),
      getRequestProjectLocations(projectIdOrValues),
    ]).then(([project, projectLocations]) => {
      if (!project) {
        throw new Error('No encontramos la solicitud indicada.')
      }

      const values = mapRequestProjectToPdfFormValues(project)

      return buildSelectionPdfPayloadFromProject(
        values,
        projectLocations,
        project.updatedAt || project.createdAt,
      )
    })
  }

  if (!locations || !generatedAt) {
    throw new Error('Faltan datos para reconstruir el PDF del proyecto.')
  }

  const pdfLocations: SelectionPdfLocation[] = locations.map((location) => ({
    locationId: location.location.id,
    locationCode: location.location.locationCode,
    locationTitle: location.location.title,
    categorySlug: location.location.categorySlug ?? '',
    images:
      location.selectedImages.length > 0
        ? location.selectedImages.map((image) => ({
            key: `${location.location.id}:${image.id}`,
            imageUrl: image.imageUrl,
            sortOrder: image.sortOrder,
          }))
        : location.location.coverImageUrl
          ? [
              {
                key: `${location.location.id}:cover`,
                imageUrl: location.location.coverImageUrl,
                sortOrder: location.sortOrder,
              },
            ]
          : [],
  }))

  const totalImages = pdfLocations.reduce(
    (count, location) => count + location.images.length,
    0,
  )

  return {
    project: {
      product: normalizeValue(projectIdOrValues.product),
      productionCompany: normalizeValue(projectIdOrValues.productionCompany),
      locationManager: normalizeValue(projectIdOrValues.locationManager),
      email: normalizeValue(projectIdOrValues.email),
      tentativeStartDate: normalizeValue(projectIdOrValues.tentativeStartDate),
      tentativeEndDate: normalizeValue(projectIdOrValues.tentativeEndDate),
    },
    generatedAt,
    totalImages,
    totalLocations: pdfLocations.length,
    locations: pdfLocations,
  }
}

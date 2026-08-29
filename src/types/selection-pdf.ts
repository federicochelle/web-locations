export type SelectionPdfProject = {
  product: string
  productionCompany: string
  productionCompanyId?: string | null
  productionCompanyLogoUrl?: string | null
  tentativeStartDate: string
  tentativeEndDate: string
  message: string
}

export type SelectionPdfLocationImage = {
  key: string
  imageUrl: string
  sortOrder: number | null
}

export type SelectionPdfLocation = {
  locationId: string
  locationCode: string
  locationTitle: string
  categorySlug: string
  images: SelectionPdfLocationImage[]
}

export type SelectionPdfPayload = {
  project: SelectionPdfProject
  generatedAt: string
  totalImages: number
  totalLocations: number
  locations: SelectionPdfLocation[]
}

export type SelectionPdfFlowStep =
  | 'form'
  | 'generating'
  | 'success'
  | 'error'

export type SelectionPdfProgressStage =
  | 'saving-project'
  | 'preparing-images'
  | 'building-pdf'
  | 'uploading-pdf'
  | 'finalizing-project'
  | 'completed'

export type SelectionPdfProgress = {
  stage: SelectionPdfProgressStage
  percent: number
  current?: number
  total?: number
  locationCode?: string
}

export type SelectionPdfFailedImage = {
  key: string
  imageUrl: string
  locationCode: string
  message: string
}

export type SelectionPdfExportResult = {
  blob: Blob
  fileName: string
  totalImages: number
  includedImages: number
  failedImages: SelectionPdfFailedImage[]
}

export type SelectionPdfFormValues = {
  product: string
  productionCompany: string
  productionCompanyId: string | null
  tentativeStartDate: string
  tentativeEndDate: string
  message: string
}

export type SelectionPdfFormErrors = Partial<
  Record<keyof SelectionPdfFormValues, string>
>

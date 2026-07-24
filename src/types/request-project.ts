export type RequestProjectStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'contacted'
  | 'closed'

export type RequestProject = {
  id: string
  title: string
  message: string | null
  status: RequestProjectStatus
  tentativeStartDate: string | null
  tentativeEndDate: string | null
  createdAt: string
  updatedAt: string
  locationCount: number
  firstLocation: {
    title: string
    coverImageUrl: string | null
  } | null
  officialPdf: {
    bucket: string
    path: string
    fileName: string
    generatedAt: string
    uploadedAt: string
    sizeBytes: number
  } | null
}

export type RequestProjectLocation = {
  id: string
  notes: string | null
  sortOrder: number | null
  createdAt: string
  selectedImages: {
    id: string
    locationImageId: string | null
    imageUrl: string
    sortOrder: number | null
    createdAt: string
  }[]
  location: {
    id: string
    slug: string
    title: string
    locationCode: string
    categorySlug: string | null
    categoryName: string
    departmentName: string
    zoneName: string
    coverImageUrl: string | null
    coverImageAlt: string
  }
}

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
  createdAt: string
  updatedAt: string
  locationCount: number
}

export type RequestProjectLocation = {
  id: string
  notes: string | null
  sortOrder: number | null
  createdAt: string
  location: {
    id: string
    slug: string
    title: string
    locationCode: string
    categoryName: string
    departmentName: string
    zoneName: string
    coverImageUrl: string | null
    coverImageAlt: string
  }
}

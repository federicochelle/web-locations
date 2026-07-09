export type LocationImage = {
  id: string
  locationId: string
  url: string
  alt: string
  isPrimary: boolean
  sortOrder: number
}

export type Category = {
  id: string
  name: string
  slug: string
  imageUrl?: string | null
  description?: string
}

export type Department = {
  id: string
  name: string
  slug: string
}

export type Zone = {
  id: string
  departmentId: string
  name: string
  slug: string
}

export type Feature = {
  id: string
  name: string
  slug: string
  group?: string | null
  type?: string | null
  active?: boolean | null
  aliases?: string[]
}

export type LocationFeature = {
  id: string
  locationId: string
  featureId: string
  feature?: Feature
}

export type Location = {
  id: string
  slug: string
  name: string
  locationCode?: string
  shortDescription: string
  description: string
  capacity: number
  priceLabel: string
  isFeatured: boolean
  category: Category
  department: Department
  zone: Zone
  images: LocationImage[]
  features: Feature[]
}

export type PublicLocationCard = {
  id: string
  slug: string
  title: string
  locationCode: string
  categoryName: string
  departmentName: string
  zoneName: string
  coverImageUrl: string | null
  coverImageAlt: string
  features: string[]
  matchedFeatureCount?: number
  selectedFeatureCount?: number
  featureMatchMode?: 'exact' | 'similar' | null
}

export type PublicLocationDetailImage = {
  url: string
  sortOrder: number | null
}

export type PublicLocationDetail = {
  id: string
  slug: string
  title: string
  locationCode: string
  images: PublicLocationDetailImage[]
}

export type LocationRequestStatus =
  | 'pending'
  | 'in_review'
  | 'contacted'
  | 'closed'

export type MyLocationRequest = {
  id: string
  createdAt: string
  status: LocationRequestStatus
  message: string
  location: {
    id: string
    slug: string
    title: string
    locationCode: string
    categoryName: string
    coverImageUrl: string | null
  }
}

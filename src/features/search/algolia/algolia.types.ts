export type AlgoliaLocationHit = {
  objectID: string
  location_code: string | null
  slug: string | null
  category_slug: string | null
  category_name: string | null
  category_aliases: string[] | null
  department_slug: string | null
  department_name: string | null
  features: string[] | null
  feature_slugs: string[] | null
  feature_aliases: string[] | null
  tags: string[] | null
  short_description: string | null
  description: string | null
  published: boolean | null
  cover_url: string | null
}

export type AlgoliaSearchConfig = {
  appId: string
  searchApiKey: string
  indexName: string
}

export type AlgoliaIndexSettings = {
  attributesForFaceting?: string[] | null
  searchableAttributes?: string[] | null
}

export type AlgoliaIndexCapabilities = {
  attributesForFaceting: string[]
  searchableAttributes: string[]
  supportsCategorySlugFilter: boolean
  supportsDepartmentSlugFilter: boolean
  supportsFeatureSlugsFilter: boolean
  supportsPublishedFilter: boolean
}

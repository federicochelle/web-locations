export type AlgoliaLocationHit = {
  objectID: string
  location_code: string | null
  slug: string | null
  short_description: string | null
  description: string | null
  premium: boolean | null
  featured: boolean | null
  visibility_level: string | null
  address_public: string | null
  category_name: string | null
  category_slug: string | null
  category_aliases: string[] | null
  department_name: string | null
  department_slug: string | null
  features: string[] | null
  feature_slugs: string[] | null
  feature_aliases: string[] | null
  tags: string[] | null
  tag_slugs: string[] | null
  cover_url: string | null
  cover_alt_text: string | null
  created_at: string | null
  updated_at: string | null
}

export type AlgoliaSearchConfig = {
  appId: string
  searchApiKey: string
  indexName: string
}

export function categoriesUrl(config) {
  return `${config.supabaseUrl}/rest/v1/categories?select=id,name,slug,image_url&order=name`
}

export function publicDepartmentsUrl(config) {
  return `${config.supabaseUrl}/rest/v1/rpc/get_public_departments_with_locations`
}

export function publicDepartmentsByCategoryUrl(config) {
  return `${config.supabaseUrl}/rest/v1/rpc/get_public_departments_by_category`
}

export function searchV2Url(config) {
  return `${config.supabaseUrl}/rest/v1/rpc/search_public_locations_v2`
}

export function searchV4Url(config) {
  return `${config.supabaseUrl}/rest/v1/rpc/search_public_locations_v4`
}

export function searchV4RelatedUrl(config) {
  return `${config.supabaseUrl}/rest/v1/rpc/search_public_locations_v4_related`
}

export function searchInterpretationUrl(config) {
  return `${config.supabaseUrl}/functions/v1/search-query-analysis`
}

export function locationDetailUrl(config, locationCode) {
  const select = encodeURIComponent(
    `
      id,
      slug,
      title,
      description,
      location_code,
      approx_lat,
      approx_lng,
      approx_radius,
      published,
      departments(name),
      zones(name),
      categories(slug),
      location_images(id,url,sort_order)
    `.replace(/\s+/g, ''),
  )
  const normalizedLocationCode = encodeURIComponent(locationCode)

  return `${config.supabaseUrl}/rest/v1/locations?select=${select}&published=eq.true&location_code=eq.${normalizedLocationCode}&limit=1`
}

import http from 'k6/http'
import { check, sleep } from 'k6'
import exec from 'k6/execution'

import {
  CAPACITY_STAGE_KEYS,
  endpointTrends,
  endpointErrorCounts,
  endpointRequestCounts,
  endpoint4xxCounts,
  endpoint429Counts,
  endpoint5xxCounts,
  endpointTimeoutCounts,
  endpointStageRequestCounts,
  endpointStageTrends,
  errorRate,
  getRuntimeConfig,
  getSupabaseHeaders,
  http4xx,
  http429,
  http429Rate,
  http5xx,
  http5xxRate,
  slowRequestCount,
  slowRequestRate,
  stageDurationTrends,
  stageErrorCounts,
  stageRequestCounts,
  timeoutCount,
  timeoutRate,
} from './config.js'
import {
  categoriesUrl,
  locationDetailUrl,
  publicDepartmentsByCategoryUrl,
  publicDepartmentsUrl,
  searchInterpretationUrl,
  searchV2Url,
  searchV4RelatedUrl,
  searchV4Url,
} from './endpoints.js'
import { clampArray, randomBetween, randomItem, uniqBy } from './utils.js'

export const runtimeConfig = getRuntimeConfig()
export const supabaseHeaders = getSupabaseHeaders(runtimeConfig)

function debugLog(label, payload) {
  if (!runtimeConfig.debug) {
    return
  }

  console.log(`[load-tests] ${label}: ${JSON.stringify(payload)}`)
}

function jsonOrNull(response) {
  try {
    return response.json()
  } catch {
    return null
  }
}

function currentCapacityStage() {
  const elapsedMs = exec.instance.currentTestRunDuration

  if (elapsedMs >= 45000 && elapsedMs < 90000) {
    return 'stage_5'
  }

  if (elapsedMs >= 135000 && elapsedMs < 180000) {
    return 'stage_10'
  }

  if (elapsedMs >= 240000 && elapsedMs < 360000) {
    return 'stage_25'
  }

  return null
}

function addMetrics(endpointKey, response, ok) {
  const stageKey = currentCapacityStage()

  endpointTrends[endpointKey].add(response.timings.duration)
  endpointRequestCounts[endpointKey].add(1)

  if (response.status >= 400 && response.status < 500) {
    http4xx.add(1)
    endpoint4xxCounts[endpointKey].add(1)
  }

  if (response.status === 429) {
    http429.add(1)
    http429Rate.add(true)
    endpoint429Counts[endpointKey].add(1)
  } else {
    http429Rate.add(false)
  }

  if (response.status >= 500) {
    http5xx.add(1)
    http5xxRate.add(true)
    endpoint5xxCounts[endpointKey].add(1)
  } else {
    http5xxRate.add(false)
  }

  const isTimeout =
    response.status === 0 ||
    String(response.error || '').toLowerCase().includes('timeout')

  if (isTimeout) {
    timeoutCount.add(1)
    endpointTimeoutCounts[endpointKey].add(1)
  }

  if (response.timings.duration > runtimeConfig.slowRequestMs) {
    slowRequestCount.add(1)
  }

  timeoutRate.add(isTimeout)
  slowRequestRate.add(response.timings.duration > runtimeConfig.slowRequestMs)
  errorRate.add(!ok)

  if (!ok) {
    endpointErrorCounts[endpointKey].add(1)
  }

  if (stageKey && CAPACITY_STAGE_KEYS.includes(stageKey)) {
    stageDurationTrends[stageKey].add(response.timings.duration)
    stageRequestCounts[stageKey].add(1)
    endpointStageTrends[`${endpointKey}__${stageKey}`].add(response.timings.duration)
    endpointStageRequestCounts[`${endpointKey}__${stageKey}`].add(1)

    if (!ok) {
      stageErrorCounts[stageKey].add(1)
    }
  }
}

function request(name, method, url, body, params, expectedStatuses) {
  const response =
    method === 'GET'
      ? http.get(url, params)
      : http.post(url, body, params)

  const ok = check(response, {
    [`${name} returned expected status`]: (res) => expectedStatuses.includes(res.status),
  })

  addMetrics(name, response, ok)

  return response
}

function appGet(endpointKey, path) {
  return request(
    endpointKey,
    'GET',
    `${runtimeConfig.baseUrl}${path}`,
    null,
    {
      timeout: `${runtimeConfig.appRequestTimeoutMs}ms`,
      tags: {
        endpoint: endpointKey,
        surface: 'page',
      },
      redirects: 0,
    },
    [200],
  )
}

function apiGet(endpointKey, url) {
  return request(
    endpointKey,
    'GET',
    url,
    null,
    {
      timeout: `${runtimeConfig.apiRequestTimeoutMs}ms`,
      headers: supabaseHeaders,
      tags: {
        endpoint: endpointKey,
        surface: 'api',
      },
    },
    [200],
  )
}

function apiPost(endpointKey, url, payload) {
  return request(
    endpointKey,
    'POST',
    url,
    JSON.stringify(payload),
    {
      timeout: `${runtimeConfig.apiRequestTimeoutMs}ms`,
      headers: supabaseHeaders,
      tags: {
        endpoint: endpointKey,
        surface: 'api',
      },
    },
    [200],
  )
}

function buildDetailPath(location) {
  return `/categorias/${location.categorySlug}/${location.locationCode}`
}

function pickQueryTerm(dataset) {
  if (dataset.searchSamples.length > 0) {
    return randomItem(dataset.searchSamples)
  }

  return {
    term: randomItem(runtimeConfig.searchTerms),
    interpretation: null,
    hits: [],
  }
}

function pickCategory(dataset) {
  return randomItem(dataset.categories)
}

function pickLocation(dataset) {
  return randomItem(dataset.locations)
}

function parseInterpretationResponse(response, fallbackTerm) {
  const payload = jsonOrNull(response)

  if (!payload || typeof payload.coreQuery !== 'string') {
    return {
      coreQuery: fallbackTerm,
      optionalTerms: [],
      categorySlugs: [],
      featureSlugs: [],
      freeTextTerms: [],
      tagSlugs: [],
    }
  }

  return {
    coreQuery: payload.coreQuery || fallbackTerm,
    optionalTerms: Array.isArray(payload.optionalTerms) ? payload.optionalTerms : [],
    categorySlugs: Array.isArray(payload.categorySlugs) ? payload.categorySlugs : [],
    featureSlugs: Array.isArray(payload.featureSlugs) ? payload.featureSlugs : [],
    freeTextTerms: Array.isArray(payload.freeTextTerms) ? payload.freeTextTerms : [],
    tagSlugs: Array.isArray(payload.tagSlugs) ? payload.tagSlugs : [],
  }
}

function buildCategorySlugByName(categories) {
  const categorySlugByName = new Map()

  for (const category of categories) {
    const normalizedName = String(category?.name || '').trim()
    const normalizedSlug = String(category?.slug || '').trim()

    if (!normalizedName || !normalizedSlug) {
      continue
    }

    categorySlugByName.set(normalizedName, normalizedSlug)
  }

  return categorySlugByName
}

function mapLocationSample(location, fallbackCategorySlug, categorySlugByName) {
  const locationCode = String(location?.location_code || '').trim()
  const categorySlug =
    String(location?.category_slug || '').trim() ||
    categorySlugByName.get(String(location?.category_name || '').trim()) ||
    fallbackCategorySlug ||
    ''

  if (!locationCode || !categorySlug) {
    return null
  }

  return {
    id: location.id,
    categorySlug,
    locationCode,
    title: locationCode,
  }
}

export function setupSuite() {
  const categoriesResponse = apiGet('api_categories', categoriesUrl(runtimeConfig))
  const categories = clampArray(jsonOrNull(categoriesResponse) || [], runtimeConfig.sampleCategoryLimit)
    .filter((category) => category?.slug)
    .map((category) => ({
      id: category.id,
      name: category.name || category.slug,
      slug: category.slug,
    }))
  const categorySlugByName = buildCategorySlugByName(categories)

  const departmentsResponse = apiPost('api_departments', publicDepartmentsUrl(runtimeConfig), {})
  const departments = (jsonOrNull(departmentsResponse) || [])
    .filter((department) => department?.slug)
    .map((department) => ({
      id: department.id,
      name: department.name || department.slug,
      slug: department.slug,
    }))

  const categorySamples = []
  const locations = []

  for (const category of categories) {
    const categoryDepartmentsResponse = apiPost(
      'api_departments_by_category',
      publicDepartmentsByCategoryUrl(runtimeConfig),
      {
        p_category_slug: category.slug,
      },
    )
    const categoryDepartments = (jsonOrNull(categoryDepartmentsResponse) || [])
      .filter((department) => department?.slug)
      .map((department) => ({
        id: department.id,
        name: department.name || department.slug,
        slug: department.slug,
      }))

    const categoryResultsResponse = apiPost('api_search_v2', searchV2Url(runtimeConfig), {
      p_query: null,
      p_category_slug: category.slug,
      p_department_slug: null,
      p_feature_slugs: [],
      p_tag_slugs: [],
      p_limit: runtimeConfig.sampleLocationLimit,
      p_offset: 0,
    })

    const categoryLocations = (jsonOrNull(categoryResultsResponse) || [])
      .map((location) => mapLocationSample(location, category.slug, categorySlugByName))
      .filter((location) => Boolean(location))

    categorySamples.push({
      ...category,
      departments: categoryDepartments,
      locations: categoryLocations,
    })
    locations.push(...categoryLocations)
  }

  const searchSamples = []

  for (const term of runtimeConfig.searchTerms) {
    const interpretationResponse = apiPost(
      'api_search_interpretation',
      searchInterpretationUrl(runtimeConfig),
      {
        query: term,
      },
    )
    const interpretation = parseInterpretationResponse(interpretationResponse, term)
    const strictResponse = apiPost('api_search_v4', searchV4Url(runtimeConfig), {
      p_category_slugs: interpretation.categorySlugs,
      p_core_query: interpretation.coreQuery || term,
      p_department_slug: null,
      p_feature_slugs: interpretation.featureSlugs,
      p_free_text_terms: interpretation.freeTextTerms,
      p_limit: runtimeConfig.sampleLocationLimit,
      p_tag_slugs: interpretation.tagSlugs,
    })
    const strictHits = (jsonOrNull(strictResponse) || [])
      .map((location) => mapLocationSample(location, null, categorySlugByName))
      .filter((location) => Boolean(location))

    let relatedHits = []

    if (strictHits.length === 0) {
      const relatedResponse = apiPost('api_search_v4_related', searchV4RelatedUrl(runtimeConfig), {
        p_category_slugs: interpretation.categorySlugs,
        p_core_query: interpretation.coreQuery || term,
        p_department_slug: null,
        p_feature_slugs: interpretation.featureSlugs,
        p_free_text_terms: interpretation.freeTextTerms,
        p_limit: Math.min(runtimeConfig.sampleLocationLimit, 6),
        p_tag_slugs: interpretation.tagSlugs,
      })
      relatedHits = (jsonOrNull(relatedResponse) || [])
        .map((location) => mapLocationSample(location, null, categorySlugByName))
        .filter((location) => Boolean(location))
    }

    const allHits = strictHits.length > 0 ? strictHits : relatedHits

    if (allHits.length > 0) {
      searchSamples.push({
        term,
        interpretation,
        hits: allHits,
      })
      locations.push(...allHits)
    }
  }

  if (locations.length === 0) {
    const broadSearchResponse = apiPost('api_search_v2', searchV2Url(runtimeConfig), {
      p_query: null,
      p_category_slug: null,
      p_department_slug: null,
      p_feature_slugs: [],
      p_tag_slugs: [],
      p_limit: runtimeConfig.sampleLocationLimit,
      p_offset: 0,
    })
    const broadLocations = (jsonOrNull(broadSearchResponse) || [])
      .map((location) => mapLocationSample(location, null, categorySlugByName))
      .filter((location) => Boolean(location))

    locations.push(...broadLocations)
  }

  const dedupedLocations = uniqBy(
    locations.filter((location) => location?.locationCode && location?.categorySlug),
    (location) => `${location.categorySlug}:${location.locationCode}`,
  )

  const dataset = {
    categories: categorySamples.length > 0 ? categorySamples : [{
      id: 'fallback',
      name: 'Locaciones',
      slug: 'locaciones',
      departments: [],
      locations: dedupedLocations,
    }],
    departments,
    locations: dedupedLocations,
    searchSamples,
  }

  if (dataset.locations.length === 0) {
    throw new Error('No se pudieron descubrir locaciones publicas para la suite de load testing.')
  }

  debugLog('setup-dataset', {
    categories: dataset.categories.length,
    departments: dataset.departments.length,
    locations: dataset.locations.length,
    searchSamples: dataset.searchSamples.length,
  })

  return dataset
}

export function runSearchJourneyWithoutInterpretation(dataset) {
  const sample = pickQueryTerm(dataset)
  const term = sample.term

  appGet('page_search', `/busqueda?q=${encodeURIComponent(term)}`)

  const strictResponse = apiPost('api_search_v4', searchV4Url(runtimeConfig), {
    p_category_slugs: [],
    p_core_query: term,
    p_department_slug: null,
    p_feature_slugs: [],
    p_free_text_terms: [],
    p_limit: runtimeConfig.sampleLocationLimit,
    p_tag_slugs: [],
  })

  const strictHits = (jsonOrNull(strictResponse) || []).filter((location) =>
    Boolean(location?.location_code),
  )

  if (strictHits.length === 0) {
    apiPost('api_search_v4_related', searchV4RelatedUrl(runtimeConfig), {
      p_category_slugs: [],
      p_core_query: term,
      p_department_slug: null,
      p_feature_slugs: [],
      p_free_text_terms: [],
      p_limit: Math.min(runtimeConfig.sampleLocationLimit, 6),
      p_tag_slugs: [],
    })
  }
}

export function runSearchJourney(dataset) {
  const sample = pickQueryTerm(dataset)
  const term = sample.term
  const interpretation = sample.interpretation || {
    coreQuery: term,
    optionalTerms: [],
    categorySlugs: [],
    featureSlugs: [],
    freeTextTerms: [],
    tagSlugs: [],
  }

  appGet('page_search', `/busqueda?q=${encodeURIComponent(term)}`)

  const freshInterpretationResponse = apiPost(
    'api_search_interpretation',
    searchInterpretationUrl(runtimeConfig),
    {
      query: term,
    },
  )
  const effectiveInterpretation = parseInterpretationResponse(freshInterpretationResponse, term)
  const effectiveCoreQuery = effectiveInterpretation.coreQuery || interpretation.coreQuery || term

  const strictResponse = apiPost('api_search_v4', searchV4Url(runtimeConfig), {
    p_category_slugs: effectiveInterpretation.categorySlugs,
    p_core_query: effectiveCoreQuery,
    p_department_slug: null,
    p_feature_slugs: effectiveInterpretation.featureSlugs,
    p_free_text_terms: effectiveInterpretation.freeTextTerms,
    p_limit: runtimeConfig.sampleLocationLimit,
    p_tag_slugs: effectiveInterpretation.tagSlugs,
  })

  const strictHits = (jsonOrNull(strictResponse) || [])
    .filter((location) => location?.location_code && location?.category_slug)

  if (strictHits.length === 0) {
    apiPost('api_search_v4_related', searchV4RelatedUrl(runtimeConfig), {
      p_category_slugs: effectiveInterpretation.categorySlugs,
      p_core_query: effectiveCoreQuery,
      p_department_slug: null,
      p_feature_slugs: effectiveInterpretation.featureSlugs,
      p_free_text_terms: effectiveInterpretation.freeTextTerms,
      p_limit: Math.min(runtimeConfig.sampleLocationLimit, 6),
      p_tag_slugs: effectiveInterpretation.tagSlugs,
    })
  }
}

export function runDetailJourney(dataset) {
  const location = pickLocation(dataset)

  appGet('page_detail', buildDetailPath(location))
  apiGet('api_location_detail', locationDetailUrl(runtimeConfig, location.locationCode))
}

export function runCategoryOrHomeJourney(dataset) {
  if (Math.random() < 0.5) {
    appGet('page_home', '/')
    apiGet('api_categories', categoriesUrl(runtimeConfig))
    return
  }

  const category = pickCategory(dataset)
  const selectedDepartment =
    category.departments.length > 0 && Math.random() < 0.35
      ? randomItem(category.departments)
      : null
  const categoryPath = selectedDepartment
    ? `/categorias/${category.slug}?department=${encodeURIComponent(selectedDepartment.slug)}`
    : `/categorias/${category.slug}`

  appGet('page_category', categoryPath)
  apiPost('api_departments_by_category', publicDepartmentsByCategoryUrl(runtimeConfig), {
    p_category_slug: category.slug,
  })
  apiPost('api_search_v2', searchV2Url(runtimeConfig), {
    p_query: null,
    p_category_slug: category.slug,
    p_department_slug: selectedDepartment?.slug ?? null,
    p_feature_slugs: [],
    p_tag_slugs: [],
    p_limit: runtimeConfig.sampleLocationLimit,
    p_offset: 0,
  })
}

export function runAdditionalReadOnlyJourney(dataset) {
  if (Math.random() < 0.5) {
    appGet('page_extra', '/nosotros')
  } else if (Math.random() < 0.5) {
    appGet('page_extra', '/terminos')
  } else {
    appGet('page_extra', '/privacidad')
  }

  if (dataset.departments.length > 0) {
    apiPost('api_departments', publicDepartmentsUrl(runtimeConfig), {})
  } else {
    apiGet('api_categories', categoriesUrl(runtimeConfig))
  }
}

export function runWeightedJourney(dataset) {
  const chance = Math.random()

  if (chance < 0.4) {
    runSearchJourney(dataset)
  } else if (chance < 0.7) {
    runDetailJourney(dataset)
  } else if (chance < 0.9) {
    runCategoryOrHomeJourney(dataset)
  } else {
    runAdditionalReadOnlyJourney(dataset)
  }

  sleep(randomBetween(
    runtimeConfig.thinkTimeMinSeconds,
    runtimeConfig.thinkTimeMaxSeconds,
  ))
}

export function runWeightedJourneyWithoutInterpretation(dataset) {
  const chance = Math.random()

  if (chance < 0.4) {
    runSearchJourneyWithoutInterpretation(dataset)
  } else if (chance < 0.7) {
    runDetailJourney(dataset)
  } else if (chance < 0.9) {
    runCategoryOrHomeJourney(dataset)
  } else {
    runAdditionalReadOnlyJourney(dataset)
  }

  sleep(randomBetween(
    runtimeConfig.thinkTimeMinSeconds,
    runtimeConfig.thinkTimeMaxSeconds,
  ))
}

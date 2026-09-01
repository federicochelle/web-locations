import { Counter, Rate, Trend } from 'k6/metrics'

const DEFAULT_SEARCH_TERMS = [
  'montevideo',
  'casa',
  'playa',
  'campo',
  'oficina',
  'hotel',
  'galpon',
  'estudio',
]

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseFloatValue(value, fallback) {
  const parsed = Number.parseFloat(String(value ?? ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseCsv(value, fallback = []) {
  const raw = String(value ?? '')

  if (!raw.trim()) {
    return fallback
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

export const ENDPOINT_KEYS = [
  'page_home',
  'page_search',
  'page_category',
  'page_detail',
  'page_extra',
  'api_categories',
  'api_departments',
  'api_departments_by_category',
  'api_search_interpretation',
  'api_search_v2',
  'api_search_v4',
  'api_search_v4_related',
  'api_location_detail',
]

export const CAPACITY_STAGE_KEYS = ['stage_5', 'stage_10', 'stage_25']

export const endpointTrends = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Trend(`endpoint_${key}_duration`, true)]),
)
export const endpointRequestCounts = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Counter(`endpoint_${key}_requests`)]),
)
export const endpoint4xxCounts = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Counter(`endpoint_${key}_4xx`)]),
)
export const endpoint429Counts = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Counter(`endpoint_${key}_429`)]),
)
export const endpoint5xxCounts = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Counter(`endpoint_${key}_5xx`)]),
)
export const endpointTimeoutCounts = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Counter(`endpoint_${key}_timeouts`)]),
)

export const errorRate = new Rate('error_rate')
export const http429Rate = new Rate('http_429_rate')
export const http5xxRate = new Rate('http_5xx_rate')
export const timeoutRate = new Rate('timeout_rate')
export const slowRequestRate = new Rate('slow_request_rate')
export const http4xx = new Counter('http_4xx')
export const http429 = new Counter('http_429')
export const http5xx = new Counter('http_5xx')
export const timeoutCount = new Counter('timeout_count')
export const slowRequestCount = new Counter('slow_request_count')
export const endpointErrorCounts = Object.fromEntries(
  ENDPOINT_KEYS.map((key) => [key, new Counter(`endpoint_${key}_errors`)]),
)
export const stageDurationTrends = Object.fromEntries(
  CAPACITY_STAGE_KEYS.map((key) => [key, new Trend(`${key}_duration`, true)]),
)
export const stageRequestCounts = Object.fromEntries(
  CAPACITY_STAGE_KEYS.map((key) => [key, new Counter(`${key}_requests`)]),
)
export const stageErrorCounts = Object.fromEntries(
  CAPACITY_STAGE_KEYS.map((key) => [key, new Counter(`${key}_errors`)]),
)
export const endpointStageTrends = Object.fromEntries(
  ENDPOINT_KEYS.flatMap((endpointKey) =>
    CAPACITY_STAGE_KEYS.map((stageKey) => [
      `${endpointKey}__${stageKey}`,
      new Trend(`endpoint_${endpointKey}_${stageKey}_duration`, true),
    ]),
  ),
)
export const endpointStageRequestCounts = Object.fromEntries(
  ENDPOINT_KEYS.flatMap((endpointKey) =>
    CAPACITY_STAGE_KEYS.map((stageKey) => [
      `${endpointKey}__${stageKey}`,
      new Counter(`endpoint_${endpointKey}_${stageKey}_requests`),
    ]),
  ),
)

export function getRuntimeConfig() {
  const baseUrl = trimTrailingSlash(__ENV.BASE_URL || 'http://127.0.0.1:4173')
  const supabaseUrl = trimTrailingSlash(__ENV.SUPABASE_URL || __ENV.VITE_SUPABASE_URL || '')
  const supabaseAnonKey = __ENV.SUPABASE_ANON_KEY || __ENV.VITE_SUPABASE_ANON_KEY || ''

  return {
    targetEnv: __ENV.TARGET_ENV || 'localhost',
    baseUrl,
    supabaseUrl,
    supabaseAnonKey,
    appRequestTimeoutMs: parseInteger(__ENV.APP_REQUEST_TIMEOUT_MS, 10000),
    apiRequestTimeoutMs: parseInteger(__ENV.API_REQUEST_TIMEOUT_MS, 12000),
    slowRequestMs: parseInteger(__ENV.SLOW_REQUEST_MS, 1000),
    thinkTimeMinSeconds: parseFloatValue(__ENV.THINK_TIME_MIN_SECONDS, 1),
    thinkTimeMaxSeconds: parseFloatValue(__ENV.THINK_TIME_MAX_SECONDS, 3),
    searchTerms: parseCsv(__ENV.SEARCH_TERMS, DEFAULT_SEARCH_TERMS),
    sampleCategoryLimit: parseInteger(__ENV.SAMPLE_CATEGORY_LIMIT, 5),
    sampleLocationLimit: parseInteger(__ENV.SAMPLE_LOCATION_LIMIT, 12),
    debug: String(__ENV.DEBUG_LOAD_TEST || '').toLowerCase() === 'true',
  }
}

export function getSupabaseHeaders(config) {
  return {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }
}

export function buildBaseThresholds() {
  return {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    error_rate: ['rate<0.01'],
    timeout_rate: ['rate==0'],
    http_429_rate: ['rate==0'],
    http_5xx_rate: ['rate==0'],
    http_429: ['count==0'],
    http_5xx: ['count==0'],
    slow_request_rate: ['rate<0.05'],
  }
}

export function buildScenarioOptions(profileName, scenario, extraThresholds = {}) {
  return {
    scenarios: {
      [profileName]: scenario,
    },
    thresholds: {
      ...buildBaseThresholds(),
      ...extraThresholds,
    },
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
    userAgent: `web-locations-k6/${profileName}`,
  }
}

export function ensureRuntimeConfig(config) {
  if (!config.baseUrl) {
    throw new Error('BASE_URL es obligatorio.')
  }

  if (!config.supabaseUrl) {
    throw new Error('SUPABASE_URL o VITE_SUPABASE_URL es obligatorio.')
  }

  if (!config.supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY o VITE_SUPABASE_ANON_KEY es obligatorio.')
  }
}

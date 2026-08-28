import { liteClient } from 'algoliasearch/lite'

import type {
  AlgoliaIndexCapabilities,
  AlgoliaIndexSettings,
  AlgoliaSearchConfig,
} from '@/features/search/algolia/algolia.types.ts'

const ALGOLIA_ENV_KEYS = {
  appId: 'VITE_ALGOLIA_APP_ID',
  searchApiKey: 'VITE_ALGOLIA_SEARCH_API_KEY',
  indexName: 'VITE_ALGOLIA_INDEX_NAME',
} as const

let cachedConfig: AlgoliaSearchConfig | null = null
let cachedClient: ReturnType<typeof liteClient> | null = null
let cachedCapabilities: AlgoliaIndexCapabilities | null = null
let cachedCapabilitiesPromise: Promise<AlgoliaIndexCapabilities> | null = null

function readEnvValue(value: string | undefined) {
  return value?.trim() ?? ''
}

export function getAlgoliaSearchConfig(): AlgoliaSearchConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  const appId = readEnvValue(import.meta.env.VITE_ALGOLIA_APP_ID)
  const searchApiKey = readEnvValue(import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY)
  const indexName = readEnvValue(import.meta.env.VITE_ALGOLIA_INDEX_NAME)

  const missingVars = [
    !appId ? ALGOLIA_ENV_KEYS.appId : null,
    !searchApiKey ? ALGOLIA_ENV_KEYS.searchApiKey : null,
    !indexName ? ALGOLIA_ENV_KEYS.indexName : null,
  ].filter(Boolean) as string[]

  if (missingVars.length > 0) {
    throw new Error(
      `Faltan variables de entorno de Algolia: ${missingVars.join(', ')}.`,
    )
  }

  cachedConfig = {
    appId,
    searchApiKey,
    indexName,
  }

  return cachedConfig
}

export function getAlgoliaSearchClient() {
  if (cachedClient) {
    return cachedClient
  }

  const config = getAlgoliaSearchConfig()
  cachedClient = liteClient(config.appId, config.searchApiKey)
  return cachedClient
}

function normalizeStringArray(value: string[] | null | undefined) {
  return (value ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function buildAlgoliaIndexCapabilities(settings: AlgoliaIndexSettings): AlgoliaIndexCapabilities {
  const attributesForFaceting = normalizeStringArray(settings.attributesForFaceting)
  const searchableAttributes = normalizeStringArray(settings.searchableAttributes)

  return {
    attributesForFaceting,
    searchableAttributes,
    supportsCategorySlugFilter: attributesForFaceting.includes('category_slug'),
    supportsDepartmentSlugFilter: attributesForFaceting.includes('department_slug'),
    supportsFeatureSlugsFilter: attributesForFaceting.includes('feature_slugs'),
    supportsPublishedFilter: attributesForFaceting.includes('published'),
  }
}

export async function getAlgoliaIndexCapabilities() {
  if (cachedCapabilities) {
    return cachedCapabilities
  }

  if (cachedCapabilitiesPromise) {
    return cachedCapabilitiesPromise
  }

  const { appId, indexName, searchApiKey } = getAlgoliaSearchConfig()

  cachedCapabilitiesPromise = fetch(`https://${appId}-dsn.algolia.net/1/indexes/${indexName}/settings`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-API-Key': searchApiKey,
      'X-Algolia-Application-Id': appId,
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('No pudimos leer la configuración del índice de Algolia.')
      }

      const settings = (await response.json()) as AlgoliaIndexSettings
      const capabilities = buildAlgoliaIndexCapabilities(settings)
      cachedCapabilities = capabilities
      return capabilities
    })
    .finally(() => {
      cachedCapabilitiesPromise = null
    })

  return cachedCapabilitiesPromise
}

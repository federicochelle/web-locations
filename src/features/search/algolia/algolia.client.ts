import { liteClient } from 'algoliasearch/lite'

import type { AlgoliaSearchConfig } from '@/features/search/algolia/algolia.types.ts'

const ALGOLIA_ENV_KEYS = {
  appId: 'VITE_ALGOLIA_APP_ID',
  searchApiKey: 'VITE_ALGOLIA_SEARCH_API_KEY',
  indexName: 'VITE_ALGOLIA_INDEX_NAME',
} as const

let cachedConfig: AlgoliaSearchConfig | null = null
let cachedClient: ReturnType<typeof liteClient> | null = null

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

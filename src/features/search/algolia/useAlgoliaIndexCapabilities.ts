import { useEffect, useState } from 'react'

import {
  getAlgoliaIndexCapabilities,
} from '@/features/search/algolia/algolia.client.ts'
import type { AlgoliaIndexCapabilities } from '@/features/search/algolia/algolia.types.ts'

type UseAlgoliaIndexCapabilitiesResult = {
  capabilities: AlgoliaIndexCapabilities | null
  error: string | null
  loading: boolean
}

export function useAlgoliaIndexCapabilities(): UseAlgoliaIndexCapabilitiesResult {
  const [capabilities, setCapabilities] = useState<AlgoliaIndexCapabilities | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function loadCapabilities() {
      try {
        setLoading(true)
        setError(null)
        const nextCapabilities = await getAlgoliaIndexCapabilities()

        if (isCancelled) {
          return
        }

        setCapabilities(nextCapabilities)
      } catch (loadError) {
        if (isCancelled) {
          return
        }

        setCapabilities(null)
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'No pudimos leer la configuración del índice de Algolia.',
        )
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    void loadCapabilities()

    return () => {
      isCancelled = true
    }
  }, [])

  return {
    capabilities,
    error,
    loading,
  }
}

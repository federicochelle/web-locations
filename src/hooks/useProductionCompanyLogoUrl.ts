import { useEffect, useRef, useState } from 'react'

import { getProductionCompanyById } from '@/services/production-companies.service.ts'

const productionCompanyLogoUrlCache = new Map<string, string | null>()
const productionCompanyLogoUrlRequests = new Map<string, Promise<string | null>>()

async function resolveProductionCompanyLogoUrl(
  productionCompanyId: string,
): Promise<string | null> {
  const normalizedProductionCompanyId = productionCompanyId.trim()

  if (!normalizedProductionCompanyId) {
    return null
  }

  if (productionCompanyLogoUrlCache.has(normalizedProductionCompanyId)) {
    return productionCompanyLogoUrlCache.get(normalizedProductionCompanyId) ?? null
  }

  const pendingRequest = productionCompanyLogoUrlRequests.get(
    normalizedProductionCompanyId,
  )

  if (pendingRequest) {
    return pendingRequest
  }

  const request = getProductionCompanyById(normalizedProductionCompanyId)
    .then((company) => {
      const resolvedLogoUrl = company?.logoUrl?.trim() || null
      productionCompanyLogoUrlCache.set(
        normalizedProductionCompanyId,
        resolvedLogoUrl,
      )

      return resolvedLogoUrl
    })
    .catch(() => {
      productionCompanyLogoUrlCache.set(normalizedProductionCompanyId, null)
      return null
    })
    .finally(() => {
      productionCompanyLogoUrlRequests.delete(normalizedProductionCompanyId)
    })

  productionCompanyLogoUrlRequests.set(normalizedProductionCompanyId, request)

  return request
}

export function useProductionCompanyLogoUrl(
  productionCompanyId: string | null | undefined,
) {
  const normalizedProductionCompanyId = productionCompanyId?.trim() || ''
  const [logoUrl, setLogoUrl] = useState<string | null>(() =>
    normalizedProductionCompanyId
      ? productionCompanyLogoUrlCache.get(normalizedProductionCompanyId) ?? null
      : null,
  )
  const requestTokenRef = useRef<symbol | null>(null)

  useEffect(() => {
    if (!normalizedProductionCompanyId) {
      requestTokenRef.current = null
      setLogoUrl(null)
      return
    }

    if (productionCompanyLogoUrlCache.has(normalizedProductionCompanyId)) {
      setLogoUrl(
        productionCompanyLogoUrlCache.get(normalizedProductionCompanyId) ?? null,
      )
      return
    }

    const requestToken = Symbol(normalizedProductionCompanyId)
    requestTokenRef.current = requestToken
    setLogoUrl(null)

    void resolveProductionCompanyLogoUrl(normalizedProductionCompanyId).then(
      (resolvedLogoUrl) => {
        if (requestTokenRef.current !== requestToken) {
          return
        }

        setLogoUrl(resolvedLogoUrl)
      },
    )

    return () => {
      if (requestTokenRef.current === requestToken) {
        requestTokenRef.current = null
      }
    }
  }, [normalizedProductionCompanyId])

  return logoUrl
}

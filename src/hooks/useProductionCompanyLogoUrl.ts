import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/hooks/useAuth.ts'
import { getProductionCompanyById } from '@/services/production-companies.service.ts'

const productionCompanyLogoUrlCache = new Map<string, string | null>()
const productionCompanyLogoUrlRequests = new Map<string, Promise<string | null>>()

async function resolveProductionCompanyLogoUrlById(
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

type UseProductionCompanyLogoResult = {
  logoUrl: string | null
  isResolving: boolean
  ensureResolved: () => Promise<string | null>
}

export function useProductionCompanyLogo(
  productionCompanyId: string | null | undefined,
) : UseProductionCompanyLogoResult {
  const { profile, role } = useAuth()
  const normalizedProductionCompanyId = productionCompanyId?.trim() || ''
  const isVisitorAssociatedProductionCompany =
    role !== 'admin' &&
    Boolean(normalizedProductionCompanyId) &&
    normalizedProductionCompanyId === (profile?.productionCompanyId?.trim() || '')
  const visitorAssociatedLogoUrl = isVisitorAssociatedProductionCompany
    ? profile?.productionCompanyLogoUrl?.trim() || null
    : null
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (visitorAssociatedLogoUrl !== null) {
      return visitorAssociatedLogoUrl
    }

    if (normalizedProductionCompanyId) {
      return productionCompanyLogoUrlCache.get(normalizedProductionCompanyId) ?? null
    }

    return null
  })
  const [isResolving, setIsResolving] = useState(false)
  const requestTokenRef = useRef<symbol | null>(null)

  const ensureResolved = useCallback(async () => {
    if (!normalizedProductionCompanyId) {
      return null
    }

    if (isVisitorAssociatedProductionCompany) {
      productionCompanyLogoUrlCache.set(normalizedProductionCompanyId, visitorAssociatedLogoUrl)
      return visitorAssociatedLogoUrl
    }

    return resolveProductionCompanyLogoUrlById(normalizedProductionCompanyId)
  }, [
    isVisitorAssociatedProductionCompany,
    normalizedProductionCompanyId,
    visitorAssociatedLogoUrl,
  ])

  useEffect(() => {
    if (!normalizedProductionCompanyId) {
      requestTokenRef.current = null
      setLogoUrl(null)
      setIsResolving(false)
      return
    }

    if (isVisitorAssociatedProductionCompany) {
      productionCompanyLogoUrlCache.set(normalizedProductionCompanyId, visitorAssociatedLogoUrl)
      requestTokenRef.current = null
      setLogoUrl(visitorAssociatedLogoUrl)
      setIsResolving(false)
      return
    }

    if (productionCompanyLogoUrlCache.has(normalizedProductionCompanyId)) {
      setLogoUrl(
        productionCompanyLogoUrlCache.get(normalizedProductionCompanyId) ?? null,
      )
      setIsResolving(false)
      return
    }

    const requestToken = Symbol(normalizedProductionCompanyId)
    requestTokenRef.current = requestToken
    setLogoUrl(null)
    setIsResolving(true)

    void resolveProductionCompanyLogoUrlById(normalizedProductionCompanyId).then(
      (resolvedLogoUrl) => {
        if (requestTokenRef.current !== requestToken) {
          return
        }

        setLogoUrl(resolvedLogoUrl)
        setIsResolving(false)
      },
    )

    return () => {
      if (requestTokenRef.current === requestToken) {
        requestTokenRef.current = null
        setIsResolving(false)
      }
    }
  }, [
    isVisitorAssociatedProductionCompany,
    normalizedProductionCompanyId,
    visitorAssociatedLogoUrl,
  ])

  return {
    logoUrl,
    isResolving,
    ensureResolved,
  }
}

export function useProductionCompanyLogoUrl(
  productionCompanyId: string | null | undefined,
) {
  return useProductionCompanyLogo(productionCompanyId).logoUrl
}

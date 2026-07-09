import { useCallback, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import {
  createLocationRequest,
  getMyLocationRequests,
  getLocationRequestErrorMessage,
} from '@/services/location-requests.service.ts'
import type { MyLocationRequest } from '@/types/location.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function useLocationRequests() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading: authLoading, role } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingRequests, setIsLoadingRequests] = useState(false)
  const [requests, setRequests] = useState<MyLocationRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submitRequest = useCallback(
    async (locationId: string, message: string) => {
      if (authLoading) {
        return false
      }

      if (!isAuthenticated) {
        navigate('/login', {
          state: {
            from: location,
          },
        })
        return false
      }

      if (role && role !== 'visitor') {
        navigate(getDefaultRouteByRole(role), { replace: true })
        return false
      }

      try {
        setIsSubmitting(true)
        setError(null)
        setSuccess(false)

        await createLocationRequest(locationId, message)

        setSuccess(true)
        return true
      } catch (submitError) {
        setError(getLocationRequestErrorMessage(submitError))
        setSuccess(false)
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [authLoading, isAuthenticated, location, navigate, role],
  )

  const refreshRequests = useCallback(async () => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated || role !== 'visitor') {
      setRequests([])
      return
    }

    try {
      setIsLoadingRequests(true)
      setError(null)

      const nextRequests = await getMyLocationRequests()
      setRequests(nextRequests)
    } catch (loadError) {
      setError(getLocationRequestErrorMessage(loadError))
      setRequests([])
    } finally {
      setIsLoadingRequests(false)
    }
  }, [authLoading, isAuthenticated, role])

  const resetRequestState = useCallback(() => {
    setError(null)
    setSuccess(false)
  }, [])

  return {
    requests,
    loading: isLoadingRequests,
    isSubmitting,
    error,
    success,
    submitRequest,
    refreshRequests,
    resetRequestState,
  }
}

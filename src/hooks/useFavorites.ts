import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from '@/services/favorites.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'
import { getDefaultRouteByRole } from '@/utils/auth-routing.ts'

export function useFavorites() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, loading: authLoading, role, user } = useAuth()

  const [favorites, setFavorites] = useState<PublicLocationCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.id)),
    [favorites],
  )

  const refreshFavorites = useCallback(async () => {
    if (!user || role !== 'visitor') {
      setFavorites([])
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const nextFavorites = await getFavorites(user.id)
      setFavorites(nextFavorites)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los favoritos.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [role, user])

  useEffect(() => {
    if (authLoading) {
      return
    }

    void refreshFavorites()
  }, [authLoading, refreshFavorites])

  const toggleFavorite = useCallback(
    async (locationCard: PublicLocationCard | { id: string }) => {
      if (authLoading) {
        return
      }

      if (!isAuthenticated) {
        navigate('/login', {
          state: {
            from: location,
          },
        })
        return
      }

      if (role && role !== 'visitor') {
        navigate(getDefaultRouteByRole(role), { replace: true })
        return
      }

      if (!user) {
        return
      }

      const locationId = locationCard.id

      if (pendingIds.includes(locationId)) {
        return
      }

      const isCurrentlyFavorite = favoriteIds.has(locationId)

      setPendingIds((currentPendingIds) => [...currentPendingIds, locationId])
      setError(null)

      try {
        if (isCurrentlyFavorite) {
          await removeFavorite(user.id, locationId)
          setFavorites((currentFavorites) =>
            currentFavorites.filter((favorite) => favorite.id !== locationId),
          )
          return
        }

        await addFavorite(user.id, locationId)

        if ('locationCode' in locationCard) {
          setFavorites((currentFavorites) => [locationCard, ...currentFavorites])
        } else {
          await refreshFavorites()
        }
      } catch (toggleError) {
        setError(
          toggleError instanceof Error
            ? toggleError.message
            : 'No se pudo actualizar el favorito.',
        )
      } finally {
        setPendingIds((currentPendingIds) =>
          currentPendingIds.filter((pendingId) => pendingId !== locationId),
        )
      }
    },
    [
      authLoading,
      favoriteIds,
      isAuthenticated,
      location,
      navigate,
      pendingIds,
      refreshFavorites,
      role,
      user,
    ],
  )

  return {
    favorites,
    favoriteIds,
    isLoading: authLoading || isLoading,
    error,
    pendingIds,
    refreshFavorites,
    toggleFavorite,
  }
}

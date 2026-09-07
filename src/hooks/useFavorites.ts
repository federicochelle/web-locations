import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth.ts'
import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from '@/services/favorites.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'

export function useFavorites() {
  const navigate = useNavigate()
  const location = useLocation()
  const { canUsePrivateFeatures, loading: authLoading, user } = useAuth()

  const ownerRef = useRef<string | undefined>(undefined)
  ownerRef.current = canUsePrivateFeatures ? user?.id : undefined

  const [favorites, setFavorites] = useState<PublicLocationCard[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<string[]>([])

  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => favorite.id)),
    [favorites],
  )

  const refreshFavorites = useCallback(async () => {
    const owner = ownerRef.current
    if (!user || !canUsePrivateFeatures) {
      setFavorites([])
      setError(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const nextFavorites = await getFavorites(user.id)
      if (ownerRef.current !== owner) return
      setFavorites(nextFavorites)
    } catch (loadError) {
      if (ownerRef.current !== owner) return
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los favoritos.',
      )
    } finally {
      if (ownerRef.current === owner) setIsLoading(false)
    }
  }, [user, canUsePrivateFeatures])

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

      if (!canUsePrivateFeatures) {
        navigate('/login', {
          state: {
            from: location,
          },
        })
        return
      }

      if (!user || !canUsePrivateFeatures) {
        return
      }

      const owner = ownerRef.current
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
          if (ownerRef.current !== owner) return
          setFavorites((currentFavorites) =>
            currentFavorites.filter((favorite) => favorite.id !== locationId),
          )
          return
        }

        await addFavorite(user.id, locationId)
        if (ownerRef.current !== owner) return

        if ('locationCode' in locationCard) {
          setFavorites((currentFavorites) => [locationCard, ...currentFavorites])
        } else {
          await refreshFavorites()
        }
      } catch (toggleError) {
        if (ownerRef.current !== owner) return
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
      canUsePrivateFeatures,
      location,
      navigate,
      pendingIds,
      refreshFavorites,
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

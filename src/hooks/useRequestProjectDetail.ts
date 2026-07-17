import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/hooks/useAuth.ts'
import { getFavorites } from '@/services/favorites.service.ts'
import {
  addLocationToRequestProject,
  getRequestProjectById,
  getRequestProjectErrorMessage,
  getRequestProjectLocations,
  removeLocationFromRequestProject,
  submitRequestProject,
  updateRequestProject,
} from '@/services/request-projects.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'
import type { RequestProject, RequestProjectLocation } from '@/types/request-project.ts'

type UpdateProjectValues = {
  title: string
  message: string
  tentativeStartDate: string | null
  tentativeEndDate: string | null
}

export function useRequestProjectDetail(projectId: string | undefined) {
  const { user } = useAuth()
  const [project, setProject] = useState<RequestProject | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMutatingLocations, setIsMutatingLocations] = useState(false)
  const [isLoadingAvailableFavorites, setIsLoadingAvailableFavorites] = useState(false)
  const [locations, setLocations] = useState<RequestProjectLocation[]>([])
  const [availableFavorites, setAvailableFavorites] = useState<PublicLocationCard[]>([])
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [removingLocationIds, setRemovingLocationIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const refreshLocations = useCallback(async () => {
    if (!projectId) {
      setLocations([])
      return
    }

    try {
      setIsLoadingLocations(true)
      const nextLocations = await getRequestProjectLocations(projectId)
      setLocations(nextLocations)
    } catch (loadError) {
      setError(getRequestProjectErrorMessage(loadError))
      setLocations([])
    } finally {
      setIsLoadingLocations(false)
    }
  }, [projectId])

  const loadAvailableFavorites = useCallback(async () => {
    if (!user || !projectId) {
      setAvailableFavorites([])
      return []
    }

    try {
      setIsLoadingAvailableFavorites(true)
      setError(null)

      const favorites = await getFavorites(user.id)
      setFavoriteCount(favorites.length)
      const currentLocationIds = new Set(locations.map((location) => location.location.id))
      const nextFavorites = favorites.filter(
        (favorite) => !currentLocationIds.has(favorite.id),
      )

      setAvailableFavorites(nextFavorites)
      return nextFavorites
    } catch (loadError) {
      setError(getRequestProjectErrorMessage(loadError))
      setFavoriteCount(0)
      setAvailableFavorites([])
      return []
    } finally {
      setIsLoadingAvailableFavorites(false)
    }
  }, [locations, projectId, user])

  const refreshProject = useCallback(async () => {
    if (!projectId) {
      setProject(null)
      setLocations([])
      setNotFound(true)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      setNotFound(false)

      const nextProject = await getRequestProjectById(projectId)

      if (!nextProject) {
        setProject(null)
        setLocations([])
        setNotFound(true)
        return
      }

      setProject(nextProject)
      const nextLocations = await getRequestProjectLocations(projectId)
      setLocations(nextLocations)
    } catch (loadError) {
      setError(getRequestProjectErrorMessage(loadError))
      setProject(null)
      setLocations([])
    } finally {
      setIsLoading(false)
      setIsLoadingLocations(false)
    }
  }, [projectId])

  useEffect(() => {
    void refreshProject()
  }, [refreshProject])

  const saveProject = useCallback(
    async ({
      title,
      message,
      tentativeStartDate,
      tentativeEndDate,
    }: UpdateProjectValues) => {
      if (!projectId) {
        return null
      }

      try {
        setIsSaving(true)
        setError(null)

        const nextProject = await updateRequestProject(projectId, {
          title,
          message: message.trim() || null,
          tentativeStartDate,
          tentativeEndDate,
        })

        setProject(nextProject)
        return nextProject
      } catch (saveError) {
        setError(getRequestProjectErrorMessage(saveError))
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [projectId],
  )

  const sendProject = useCallback(async () => {
    if (!projectId) {
      return null
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const nextProject = await submitRequestProject(projectId)
      setProject(nextProject)
      return nextProject
    } catch (submitError) {
      setError(getRequestProjectErrorMessage(submitError))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [projectId])

  const addLocation = useCallback(
    async (locationId: string) => {
      if (!projectId) {
        return false
      }

      try {
        setIsMutatingLocations(true)
        setError(null)

        await addLocationToRequestProject(projectId, locationId)
        await Promise.all([refreshProject(), refreshLocations()])
        return true
      } catch (addError) {
        setError(getRequestProjectErrorMessage(addError))
        return false
      } finally {
        setIsMutatingLocations(false)
      }
    },
    [projectId, refreshLocations, refreshProject],
  )

  const addLocations = useCallback(
    async (locationIds: string[]) => {
      if (!projectId || locationIds.length === 0) {
        return 0
      }

      let addedCount = 0

      try {
        setIsMutatingLocations(true)
        setError(null)

        for (const locationId of locationIds) {
          const result = await addLocationToRequestProject(projectId, locationId)

          if (result === 'added') {
            addedCount += 1
          }
        }

        await Promise.all([refreshProject(), refreshLocations()])
        return addedCount
      } catch (addError) {
        setError(getRequestProjectErrorMessage(addError))
        return addedCount
      } finally {
        setIsMutatingLocations(false)
      }
    },
    [projectId, refreshLocations, refreshProject],
  )

  const removeLocation = useCallback(
    async (locationId: string) => {
      if (!projectId) {
        return false
      }

      try {
        setRemovingLocationIds((currentIds) => [...currentIds, locationId])
        setError(null)

        await removeLocationFromRequestProject(projectId, locationId)
        await Promise.all([refreshProject(), refreshLocations()])
        return true
      } catch (removeError) {
        setError(getRequestProjectErrorMessage(removeError))
        return false
      } finally {
        setRemovingLocationIds((currentIds) =>
          currentIds.filter((currentId) => currentId !== locationId),
        )
      }
    },
    [projectId, refreshLocations, refreshProject],
  )

  return {
    project,
    locations,
    availableFavorites,
    favoriteCount,
    isLoading,
    isLoadingLocations,
    isSaving,
    isSubmitting,
    isMutatingLocations,
    isLoadingAvailableFavorites,
    removingLocationIds,
    error,
    notFound,
    refreshProject,
    refreshLocations,
    loadAvailableFavorites,
    saveProject,
    sendProject,
    addLocation,
    addLocations,
    removeLocation,
  }
}

import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAuth } from '@/hooks/useAuth.ts'
import { getFavorites } from '@/services/favorites.service.ts'
import {
  addLocationToRequestProject,
  ensureInitialRequestProjectVersion,
  getRequestProjectById,
  getRequestProjectErrorMessage,
  getRequestProjectLocations,
  removeLocationFromRequestProject,
  updateRequestProject,
} from '@/services/request-projects.service.ts'
import type { PublicLocationCard } from '@/types/location.ts'
import type { RequestProject, RequestProjectLocation } from '@/types/request-project.ts'
import {
  buildSelectionPdfPayloadFromProject,
  mapRequestProjectToPdfFormValues,
} from '@/utils/selection-pdf-workspace.ts'

type UpdateProjectValues = {
  title: string
  productionCompany: string
  productionCompanyId: string | null
  message: string
  tentativeStartDate: string | null
  tentativeEndDate: string | null
}

type SaveProjectOptions = {
  suppressErrorState?: boolean
}

function createLocationsSnapshot(locations: RequestProjectLocation[]) {
  return JSON.stringify(
    locations.map((location) => ({
      locationId: location.location.id,
      sortOrder: location.sortOrder ?? null,
    })),
  )
}

export function useRequestProjectDetail(projectId: string | undefined) {
  const { user } = useAuth()
  const [project, setProject] = useState<RequestProject | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isMutatingLocations, setIsMutatingLocations] = useState(false)
  const [isLoadingAvailableFavorites, setIsLoadingAvailableFavorites] = useState(false)
  const [locations, setLocations] = useState<RequestProjectLocation[]>([])
  const [availableFavorites, setAvailableFavorites] = useState<PublicLocationCard[]>([])
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [removingLocationIds, setRemovingLocationIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [persistedLocationsSnapshot, setPersistedLocationsSnapshot] = useState<string>('[]')

  const hasPendingLocationChanges = useMemo(
    () => createLocationsSnapshot(locations) !== persistedLocationsSnapshot,
    [locations, persistedLocationsSnapshot],
  )

  const ensureVersioningBaseline = useCallback(async () => {
    if (!project || project.status === 'draft' || project.latestVersionNumber > 0) {
      return
    }

    const payload = buildSelectionPdfPayloadFromProject(
      mapRequestProjectToPdfFormValues(project),
      locations,
      project.updatedAt || project.createdAt,
    )

    const result = await ensureInitialRequestProjectVersion(project, payload)

    if (result.versionNumber > 0) {
      setProject((currentProject) =>
        currentProject
          ? {
              ...currentProject,
              latestVersionNumber: Math.max(
                currentProject.latestVersionNumber,
                result.versionNumber,
              ),
            }
          : currentProject,
      )
    }
  }, [locations, project])

  const refreshLocations = useCallback(async () => {
    if (!projectId) {
      setLocations([])
      setPersistedLocationsSnapshot('[]')
      return
    }

    try {
      setIsLoadingLocations(true)
      const nextLocations = await getRequestProjectLocations(projectId)
      setLocations(nextLocations)
      setPersistedLocationsSnapshot(createLocationsSnapshot(nextLocations))
    } catch (loadError) {
      setError(getRequestProjectErrorMessage(loadError))
      setLocations([])
      setPersistedLocationsSnapshot('[]')
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
      setPersistedLocationsSnapshot(createLocationsSnapshot(nextLocations))
    } catch (loadError) {
      setError(getRequestProjectErrorMessage(loadError))
      setProject(null)
      setLocations([])
      setPersistedLocationsSnapshot('[]')
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
      productionCompany,
      productionCompanyId,
      message,
      tentativeStartDate,
      tentativeEndDate,
    }: UpdateProjectValues, options: SaveProjectOptions = {}) => {
      if (!projectId) {
        return null
      }

      try {
        setIsSaving(true)
        setError(null)
        await ensureVersioningBaseline()

        const nextProject = await updateRequestProject(projectId, {
          title,
          productionCompany: productionCompany.trim() || null,
          productionCompanyId,
          message: message.trim() || null,
          tentativeStartDate,
          tentativeEndDate,
        })

        setProject(nextProject)
        return nextProject
      } catch (saveError) {
        if (!options.suppressErrorState) {
          setError(getRequestProjectErrorMessage(saveError))
        }
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [ensureVersioningBaseline, projectId],
  )

  const addLocation = useCallback(
    async (locationId: string) => {
      if (!projectId) {
        return false
      }

      try {
        setIsMutatingLocations(true)
        setError(null)
        await ensureVersioningBaseline()

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
    [ensureVersioningBaseline, projectId, refreshLocations, refreshProject],
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

        if (project?.status === 'confirmed' || project?.status === 'closed') {
          return 0
        }

        await ensureVersioningBaseline()

        if (project?.status !== 'draft') {
          const nextFavorites = locationIds
            .filter((locationId) =>
              !locations.some((location) => location.location.id === locationId),
            )
            .map((locationId) =>
              availableFavorites.find((item) => item.id === locationId) ?? null,
            )
            .filter((favorite): favorite is PublicLocationCard => Boolean(favorite))

          addedCount = nextFavorites.length

          setLocations((currentLocations) => {
            const locationIdsInState = new Set(
              currentLocations.map((location) => location.location.id),
            )
            const nextLocations = [...currentLocations]
            const now = new Date().toISOString()

            for (const favorite of nextFavorites) {
              if (locationIdsInState.has(favorite.id)) {
                continue
              }

              locationIdsInState.add(favorite.id)
              nextLocations.push({
                id: `editable-version:${projectId}:${favorite.id}`,
                notes: null,
                sortOrder: nextLocations.length,
                createdAt: now,
                selectedImages: [],
                location: {
                  id: favorite.id,
                  slug: favorite.slug,
                  title: favorite.title,
                  locationCode: favorite.locationCode,
                  categorySlug: favorite.categorySlug,
                  categoryName: favorite.categoryName,
                  departmentName: favorite.departmentName,
                  zoneName: favorite.zoneName,
                  coverImageUrl: favorite.coverImageUrl,
                  coverImageAlt: favorite.coverImageAlt,
                },
              })
            }

            return nextLocations
          })

          return addedCount
        }

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
    [
      availableFavorites,
      ensureVersioningBaseline,
      locations,
      project?.status,
      projectId,
      refreshLocations,
      refreshProject,
    ],
  )

  const removeLocation = useCallback(
    async (locationId: string) => {
      if (!projectId) {
        return false
      }

      try {
        setRemovingLocationIds((currentIds) => [...currentIds, locationId])
        setError(null)

        if (project?.status === 'confirmed' || project?.status === 'closed') {
          return false
        }

        await ensureVersioningBaseline()

        if (project?.status !== 'draft') {
          setLocations((currentLocations) =>
            currentLocations
              .filter((location) => location.location.id !== locationId)
              .map((location, index) => ({
                ...location,
                sortOrder: index,
              })),
          )
          return true
        }

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
    [ensureVersioningBaseline, project?.status, projectId, refreshLocations, refreshProject],
  )

  return {
    project,
    locations,
    availableFavorites,
    favoriteCount,
    isLoading,
    isLoadingLocations,
    isSaving,
    isMutatingLocations,
    isLoadingAvailableFavorites,
    removingLocationIds,
    hasPendingLocationChanges,
    error,
    notFound,
    refreshProject,
    refreshLocations,
    loadAvailableFavorites,
    saveProject,
    addLocation,
    addLocations,
    removeLocation,
  }
}

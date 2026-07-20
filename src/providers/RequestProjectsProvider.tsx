import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { useAuth } from '@/hooks/useAuth.ts'
import { RequestProjectsContext } from '@/providers/RequestProjectsContext.ts'
import type {
  CreateRequestProjectValues,
  RequestProjectsContextValue,
  UpdateRequestProjectValues,
} from '@/providers/RequestProjectsContext.ts'
import {
  createRequestProject,
  deleteRequestProject,
  getMyRequestProjects,
  getRequestProjectErrorMessage,
  updateRequestProject,
} from '@/services/request-projects.service.ts'
import type { RequestProject } from '@/types/request-project.ts'

type RequestProjectsProviderProps = {
  children: ReactNode
}

export function RequestProjectsProvider({
  children,
}: RequestProjectsProviderProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<RequestProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const nextProjects = await getMyRequestProjects()
      setProjects(nextProjects)
    } catch (loadError) {
      setError(getRequestProjectErrorMessage(loadError))
      setProjects([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!isAuthenticated) {
      setProjects([])
      setError(null)
      setIsLoading(false)
      setIsCreating(false)
      setDeletingProjectId(null)
      return
    }

    void refreshProjects()
  }, [authLoading, isAuthenticated, refreshProjects])

  const createProject = useCallback(async ({
    title,
    message,
    tentativeStartDate = null,
    tentativeEndDate = null,
  }: CreateRequestProjectValues) => {
    try {
      setIsCreating(true)
      setError(null)

      const nextProject = await createRequestProject({
        title,
        message: message?.trim() || null,
        tentativeStartDate,
        tentativeEndDate,
      })

      setProjects((currentProjects) => [nextProject, ...currentProjects])
      return nextProject
    } catch (createError) {
      setError(getRequestProjectErrorMessage(createError))
      return null
    } finally {
      setIsCreating(false)
    }
  }, [])

  const updateProject = useCallback(async (
    projectId: string,
    {
      title,
      message,
      tentativeStartDate,
      tentativeEndDate,
    }: UpdateRequestProjectValues,
  ) => {
    try {
      setError(null)

      const nextProject = await updateRequestProject(projectId, {
        title,
        message: message?.trim() || null,
        tentativeStartDate,
        tentativeEndDate,
      })

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === projectId ? nextProject : project,
        ),
      )

      return nextProject
    } catch (updateError) {
      setError(getRequestProjectErrorMessage(updateError))
      return null
    }
  }, [])

  const removeProject = useCallback(async (projectId: string) => {
    try {
      setDeletingProjectId(projectId)
      setError(null)

      await deleteRequestProject(projectId)
      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      )
      return true
    } catch (deleteError) {
      setError(getRequestProjectErrorMessage(deleteError))
      return false
    } finally {
      setDeletingProjectId(null)
    }
  }, [])

  const draftProjects = useMemo(
    () => projects.filter((project) => project.status === 'draft'),
    [projects],
  )

  const value = useMemo<RequestProjectsContextValue>(
    () => ({
      projects,
      draftProjects,
      isLoading,
      isCreating,
      deletingProjectId,
      error,
      refreshProjects,
      createProject,
      updateProject,
      removeProject,
    }),
    [
      createProject,
      deletingProjectId,
      draftProjects,
      error,
      isCreating,
      isLoading,
      projects,
      refreshProjects,
      removeProject,
      updateProject,
    ],
  )

  return (
    <RequestProjectsContext.Provider value={value}>
      {children}
    </RequestProjectsContext.Provider>
  )
}

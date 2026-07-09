import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  createRequestProject,
  getMyRequestProjects,
  getRequestProjectErrorMessage,
} from '@/services/request-projects.service.ts'
import type { RequestProject } from '@/types/request-project.ts'

type CreateRequestProjectValues = {
  title: string
  message: string
}

export function useRequestProjects() {
  const [projects, setProjects] = useState<RequestProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
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
    void refreshProjects()
  }, [refreshProjects])

  const createProject = useCallback(async ({ title, message }: CreateRequestProjectValues) => {
    try {
      setIsCreating(true)
      setError(null)

      const nextProject = await createRequestProject({
        title,
        message: message.trim() || null,
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

  const draftProjects = useMemo(
    () => projects.filter((project) => project.status === 'draft'),
    [projects],
  )

  return {
    projects,
    draftProjects,
    isLoading,
    isCreating,
    error,
    refreshProjects,
    createProject,
  }
}

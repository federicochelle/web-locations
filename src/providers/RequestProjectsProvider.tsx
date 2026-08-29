import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const { isAuthenticated, loading: authLoading, profile, role } = useAuth()
  const [projects, setProjects] = useState<RequestProject[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeEditingProjectId, setActiveEditingProjectId] = useState<string | null>(null)
  const activeEditingProjectIdRef = useRef<string | null>(null)
  const editingExitHandlerRef = useRef<{
    projectId: string
    handler: () => Promise<boolean>
  } | null>(null)

  useEffect(() => {
    activeEditingProjectIdRef.current = activeEditingProjectId
  }, [activeEditingProjectId])

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
      setHasLoadedOnce(true)
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
      setHasLoadedOnce(true)
      setIsLoading(false)
      setIsCreating(false)
      setDeletingProjectId(null)
      return
    }

    setHasLoadedOnce(false)
    void refreshProjects()
  }, [authLoading, isAuthenticated, refreshProjects])

  useEffect(() => {
    if (!activeEditingProjectId) {
      return
    }

    const hasActiveProject = projects.some((project) => project.id === activeEditingProjectId)

    if (!hasActiveProject) {
      setActiveEditingProjectId(null)
      editingExitHandlerRef.current = null
    }
  }, [activeEditingProjectId, projects])

  useEffect(() => {
    if (!activeEditingProjectId) {
      return
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [activeEditingProjectId])

  const createProject = useCallback(async ({
    title,
    productionCompany = null,
    productionCompanyId = null,
    message,
    tentativeStartDate = null,
    tentativeEndDate = null,
  }: CreateRequestProjectValues) => {
    try {
      setIsCreating(true)
      setError(null)

      const isAdmin = role === 'admin'
      const resolvedProductionCompany = isAdmin
        ? productionCompany?.trim() || null
        : profile?.companyName?.trim() || null
      const resolvedProductionCompanyId = isAdmin
        ? productionCompanyId
        : profile?.productionCompanyId ?? null

      const nextProject = await createRequestProject({
        title,
        productionCompany: resolvedProductionCompany,
        productionCompanyId: resolvedProductionCompanyId,
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
  }, [profile?.companyName, profile?.productionCompanyId, role])

  const replaceProject = useCallback((nextProject: RequestProject) => {
    setProjects((currentProjects) =>
      currentProjects.map((project) =>
        project.id === nextProject.id ? nextProject : project,
      ),
    )
  }, [])

  const updateProject = useCallback(async (
    projectId: string,
    {
      title,
      productionCompany = null,
      productionCompanyId = null,
      message,
      tentativeStartDate,
      tentativeEndDate,
    }: UpdateRequestProjectValues,
  ) => {
    try {
      setError(null)

      const nextProject = await updateRequestProject(projectId, {
        title,
        productionCompany: productionCompany?.trim() || null,
        productionCompanyId,
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

  const beginProjectEditing = useCallback((projectId: string) => {
    const normalizedProjectId = projectId.trim()

    if (!normalizedProjectId) {
      return
    }

    setActiveEditingProjectId(normalizedProjectId)
  }, [])

  const finishProjectEditing = useCallback((projectId?: string | null) => {
    const normalizedProjectId = projectId?.trim() || null
    const currentEditingProjectId = activeEditingProjectIdRef.current

    if (normalizedProjectId && currentEditingProjectId !== normalizedProjectId) {
      return
    }

    editingExitHandlerRef.current = null
    setActiveEditingProjectId(null)
  }, [])

  const flushAndFinishProjectEditing = useCallback(async (projectId?: string | null) => {
    const normalizedProjectId = projectId?.trim() || null
    const currentEditingProjectId = activeEditingProjectIdRef.current

    if (!currentEditingProjectId) {
      return true
    }

    if (normalizedProjectId && currentEditingProjectId !== normalizedProjectId) {
      return true
    }

    const exitHandler = editingExitHandlerRef.current

    if (
      exitHandler &&
      exitHandler.projectId === currentEditingProjectId
    ) {
      const didFlush = await exitHandler.handler()

      if (!didFlush) {
        return false
      }
    }

    editingExitHandlerRef.current = null
    setActiveEditingProjectId(null)
    return true
  }, [])

  const registerProjectEditingExitHandler = useCallback((
    projectId: string,
    handler: () => Promise<boolean>,
  ) => {
    const normalizedProjectId = projectId.trim()

    editingExitHandlerRef.current = {
      projectId: normalizedProjectId,
      handler,
    }

    return () => {
      if (editingExitHandlerRef.current?.projectId === normalizedProjectId) {
        editingExitHandlerRef.current = null
      }
    }
  }, [])

  const value = useMemo<RequestProjectsContextValue>(
    () => ({
      projects,
      draftProjects,
      activeEditingProjectId,
      isLoading,
      hasLoadedOnce,
      isCreating,
      deletingProjectId,
      error,
      refreshProjects,
      createProject,
      replaceProject,
      updateProject,
      removeProject,
      beginProjectEditing,
      finishProjectEditing,
      flushAndFinishProjectEditing,
      registerProjectEditingExitHandler,
    }),
    [
      activeEditingProjectId,
      beginProjectEditing,
      createProject,
      deletingProjectId,
      draftProjects,
      error,
      finishProjectEditing,
      flushAndFinishProjectEditing,
      hasLoadedOnce,
      isCreating,
      isLoading,
      projects,
      replaceProject,
      registerProjectEditingExitHandler,
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

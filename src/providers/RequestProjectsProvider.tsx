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
  const { canUsePrivateFeatures, user, loading: authLoading } = useAuth()
  const accessKey = canUsePrivateFeatures ? user?.id : undefined
  const accessRef = useRef(accessKey)
  accessRef.current = accessKey
  const projectsRequestId = useRef(0)
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
    const owner = accessRef.current
    if (!owner) return
    const requestId = ++projectsRequestId.current
    try {
      setIsLoading(true)
      setError(null)

      const nextProjects = await getMyRequestProjects()
      if (accessRef.current !== owner || projectsRequestId.current !== requestId) return
      setProjects(nextProjects)
    } catch (loadError) {
      if (accessRef.current !== owner || projectsRequestId.current !== requestId) return
      setError(getRequestProjectErrorMessage(loadError))
      setProjects([])
    } finally {
      if (accessRef.current === owner && projectsRequestId.current === requestId) {
        setHasLoadedOnce(true)
        setIsLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    projectsRequestId.current += 1
    if (authLoading) {
      setProjects([])
      return
    }

    if (!canUsePrivateFeatures) {
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
  }, [accessKey, authLoading, canUsePrivateFeatures, refreshProjects])

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
    productLogoUrl = null,
    productionCompany = null,
    productionCompanyId = null,
    productionCompanyLogoUrl = null,
    message,
    tentativeStartDate = null,
    tentativeEndDate = null,
  }: CreateRequestProjectValues) => {
    const owner = accessRef.current
    if (!owner) return null
    try {
      setIsCreating(true)
      setError(null)

      const nextProject = await createRequestProject({
        title,
        productLogoUrl: productLogoUrl?.trim() || null,
        productionCompany: productionCompany?.trim() || null,
        productionCompanyId,
        productionCompanyLogoUrl: productionCompanyLogoUrl?.trim() || null,
        message: message?.trim() || null,
        tentativeStartDate,
        tentativeEndDate,
      })

      if (accessRef.current !== owner) return null
      setProjects((currentProjects) => [nextProject, ...currentProjects])
      return nextProject
    } catch (createError) {
      if (accessRef.current !== owner) return null
      setError(getRequestProjectErrorMessage(createError))
      return null
    } finally {
      if (accessRef.current === owner) setIsCreating(false)
    }
  }, [])

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
      productLogoUrl = null,
      productionCompany = null,
      productionCompanyId = null,
      productionCompanyLogoUrl = null,
      message,
      tentativeStartDate,
      tentativeEndDate,
    }: UpdateRequestProjectValues,
  ) => {
    const owner = accessRef.current
    if (!owner) return null
    try {
      setError(null)

      const nextProject = await updateRequestProject(projectId, {
        title,
        productLogoUrl: productLogoUrl?.trim() || null,
        productionCompany: productionCompany?.trim() || null,
        productionCompanyId,
        productionCompanyLogoUrl: productionCompanyLogoUrl?.trim() || null,
        message: message?.trim() || null,
        tentativeStartDate,
        tentativeEndDate,
      })

      if (accessRef.current !== owner) return null
      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id === projectId ? nextProject : project,
        ),
      )

      return nextProject
    } catch (updateError) {
      if (accessRef.current !== owner) return null
      setError(getRequestProjectErrorMessage(updateError))
      return null
    }
  }, [])

  const removeProject = useCallback(async (projectId: string) => {
    const owner = accessRef.current
    if (!owner) return false
    try {
      setDeletingProjectId(projectId)
      setError(null)

      await deleteRequestProject(projectId)
      if (accessRef.current !== owner) return false
      setProjects((currentProjects) =>
        currentProjects.filter((project) => project.id !== projectId),
      )
      return true
    } catch (deleteError) {
      if (accessRef.current !== owner) return false
      setError(getRequestProjectErrorMessage(deleteError))
      return false
    } finally {
      if (accessRef.current === owner) setDeletingProjectId(null)
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

import { createContext } from 'react'

import type { RequestProject } from '@/types/request-project.ts'

export type CreateRequestProjectValues = {
  title: string
  message: string | null
  tentativeStartDate?: string | null
  tentativeEndDate?: string | null
}

export type UpdateRequestProjectValues = {
  title: string
  message: string | null
  tentativeStartDate: string | null
  tentativeEndDate: string | null
}

export type RequestProjectsContextValue = {
  projects: RequestProject[]
  draftProjects: RequestProject[]
  isLoading: boolean
  hasLoadedOnce: boolean
  isCreating: boolean
  deletingProjectId: string | null
  error: string | null
  refreshProjects: () => Promise<void>
  createProject: (values: CreateRequestProjectValues) => Promise<RequestProject | null>
  updateProject: (
    projectId: string,
    values: UpdateRequestProjectValues,
  ) => Promise<RequestProject | null>
  removeProject: (projectId: string) => Promise<boolean>
}

export const RequestProjectsContext = createContext<
  RequestProjectsContextValue | undefined
>(undefined)

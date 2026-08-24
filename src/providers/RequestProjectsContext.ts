import { createContext } from 'react'

import type { RequestProject } from '@/types/request-project.ts'

export type CreateRequestProjectValues = {
  title: string
  productionCompany?: string | null
  productionCompanyId?: string | null
  message: string | null
  tentativeStartDate?: string | null
  tentativeEndDate?: string | null
}

export type UpdateRequestProjectValues = {
  title: string
  productionCompany?: string | null
  productionCompanyId?: string | null
  message: string | null
  tentativeStartDate: string | null
  tentativeEndDate: string | null
}

export type RequestProjectsContextValue = {
  projects: RequestProject[]
  draftProjects: RequestProject[]
  activeEditingProjectId: string | null
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
  beginProjectEditing: (projectId: string) => void
  finishProjectEditing: (projectId?: string | null) => void
  flushAndFinishProjectEditing: (projectId?: string | null) => Promise<boolean>
  registerProjectEditingExitHandler: (
    projectId: string,
    handler: () => Promise<boolean>,
  ) => () => void
}

export const RequestProjectsContext = createContext<
  RequestProjectsContextValue | undefined
>(undefined)

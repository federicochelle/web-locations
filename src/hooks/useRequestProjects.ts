import { useContext } from 'react'

import { RequestProjectsContext } from '@/providers/RequestProjectsContext.ts'

export function useRequestProjects() {
  const context = useContext(RequestProjectsContext)

  if (!context) {
    throw new Error(
      'useRequestProjects debe usarse dentro de RequestProjectsProvider.',
    )
  }

  return context
}

type SelectionPersistenceGuardState = {
  activeProjectId: string | null
  isTransitioning: boolean
}

const guardState: SelectionPersistenceGuardState = {
  activeProjectId: null,
  isTransitioning: false,
}

export function beginSelectionProjectTransition(projectId: string | null = null) {
  guardState.activeProjectId = projectId
  guardState.isTransitioning = true
}

export function markSelectionProjectStable(projectId: string) {
  guardState.activeProjectId = projectId
  guardState.isTransitioning = false
}

export function clearSelectionProjectPersistenceGuard() {
  guardState.activeProjectId = null
  guardState.isTransitioning = false
}

export function canPersistSelectionForProject(projectId: string | null) {
  return Boolean(
    projectId &&
      !guardState.isTransitioning &&
      (guardState.activeProjectId === null || guardState.activeProjectId === projectId),
  )
}

export function isSelectionProjectTransitioning() {
  return guardState.isTransitioning
}

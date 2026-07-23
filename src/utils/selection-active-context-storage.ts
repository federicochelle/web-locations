export const SELECTION_ACTIVE_CONTEXT_STORAGE_KEY = 'selection-active-context:v1'

export type SelectionActiveContext =
  | {
      mode: 'new'
    }
  | {
      mode: 'project'
      projectId: string
    }

function isSelectionActiveContext(value: unknown): value is SelectionActiveContext {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  if (candidate.mode === 'new') {
    return true
  }

  return candidate.mode === 'project' && typeof candidate.projectId === 'string'
}

export function restoreSelectionActiveContext(): SelectionActiveContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(SELECTION_ACTIVE_CONTEXT_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    const parsedValue = JSON.parse(rawValue) as unknown
    return isSelectionActiveContext(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

export function persistSelectionActiveContext(context: SelectionActiveContext) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    SELECTION_ACTIVE_CONTEXT_STORAGE_KEY,
    JSON.stringify(context),
  )
}

export function clearSelectionActiveContext() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(SELECTION_ACTIVE_CONTEXT_STORAGE_KEY)
}

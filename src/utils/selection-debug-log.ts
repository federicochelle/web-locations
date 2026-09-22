export const SELECTION_DEBUG_LOG_STORAGE_KEY = 'selection-debug-log:v1'

const MAX_SELECTION_DEBUG_EVENTS = 150
const SELECTION_DEBUG_LOG_CHANGE_EVENT = 'selection-debug-log:change'

type SelectionDebugDetails = Record<string, unknown>

export type SelectionDebugEvent = {
  timestamp: string
  event: string
  activeProjectId?: string | null
  imagesCount?: number
  projectSelectionCount?: number | null
  dirty?: boolean | null
  version?: number | null
  isHydratingActiveProjectSelection?: boolean
  isProjectSelectionPendingResolution?: boolean
  source?: string
  details?: SelectionDebugDetails
}

export function isSelectionDebugEnabled() {
  if (typeof window === 'undefined') {
    return false
  }

  return new URLSearchParams(window.location.search).get('selectionDebug') === '1'
}

function notifySelectionDebugLogChange() {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(SELECTION_DEBUG_LOG_CHANGE_EVENT))
}

export function subscribeSelectionDebugLogChange(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  window.addEventListener(SELECTION_DEBUG_LOG_CHANGE_EVENT, listener)
  return () => {
    window.removeEventListener(SELECTION_DEBUG_LOG_CHANGE_EVENT, listener)
  }
}

export function readSelectionDebugLog() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawLog = window.localStorage.getItem(SELECTION_DEBUG_LOG_STORAGE_KEY)
    const parsedLog: unknown = rawLog ? JSON.parse(rawLog) : []

    if (!Array.isArray(parsedLog)) {
      return []
    }

    return parsedLog.filter((event): event is SelectionDebugEvent =>
      Boolean(event) &&
        typeof event === 'object' &&
        typeof (event as SelectionDebugEvent).event === 'string',
    )
  } catch {
    return []
  }
}

export function clearSelectionDebugLog() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(SELECTION_DEBUG_LOG_STORAGE_KEY)
    notifySelectionDebugLogChange()
  } catch {
    // Debug logging must never affect the selection flow.
  }
}

export function appendSelectionDebugEvent(
  event: Omit<SelectionDebugEvent, 'timestamp'> & { timestamp?: string },
) {
  if (!isSelectionDebugEnabled()) {
    return
  }

  try {
    const nextEvent: SelectionDebugEvent = {
      timestamp: event.timestamp ?? new Date().toISOString(),
      ...event,
    }
    const nextLog = [...readSelectionDebugLog(), nextEvent].slice(
      -MAX_SELECTION_DEBUG_EVENTS,
    )

    window.localStorage.setItem(
      SELECTION_DEBUG_LOG_STORAGE_KEY,
      JSON.stringify(nextLog),
    )
    notifySelectionDebugLogChange()
  } catch {
    // Debug logging must never affect the selection flow.
  }
}


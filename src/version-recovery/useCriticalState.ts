import { useLayoutEffect } from 'react'
import { registerCriticalState } from './dirty-state.ts'

export function useCriticalState(dirty: boolean) {
  useLayoutEffect(() => registerCriticalState(() => dirty), [dirty])
}

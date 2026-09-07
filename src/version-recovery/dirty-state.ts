// Read-only predicates: no form values leave the component or enter telemetry.
const guards = new Set<() => boolean>()
export function registerCriticalState(guard: () => boolean) {
  guards.add(guard)
  return () => { guards.delete(guard) }
}
export function hasUnsavedCriticalState() {
  for (const guard of guards) {
    try { if (guard()) return true } catch { return true }
  }
  return false
}

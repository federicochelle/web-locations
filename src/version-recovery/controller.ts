import { assetFromFailure, isVersionSkewError, normalizeRoute } from './classify.ts'
import type { Failure } from './classify.ts'

export const RETRY_KEY = 'version-recovery:reload-consumed:v1'
export const INCIDENT_KEY = 'version-recovery:incident:v1'
export type RecoveryState = 'idle' | 'reloading' | 'blocked_dirty_state' | 'failed_after_reload' | 'storage_unavailable'
export type RecoveryReport = {
  tags: {
    error_type: 'chunk_load'
    recovery: Exclude<RecoveryState, 'idle' | 'reloading'> | 'reload_once'
    release: string
    route: string
    asset_type: 'js' | 'css' | 'module'
  }
  extra: {
    asset_pathname?: string
    source: Failure['source']
    retry_consumed: boolean
    dirty_state: boolean
  }
}

type Dependencies = {
  release: string
  storage: () => Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  dirty: () => boolean
  route: () => string
  report: (report: RecoveryReport) => void
  flush: () => Promise<unknown>
  reload: () => void
  flushTimeout?: number
}

export function createRecoveryController(deps: Dependencies) {
  let state: RecoveryState = 'idle'
  let consumedInMemory = false
  let incidentDirty = false
  const listeners = new Set<() => void>()
  function setState(next: RecoveryState) {
    state = next
    listeners.forEach(listener => listener())
  }
  function report(failure: Failure, recovery: RecoveryReport['tags']['recovery'], consumed: boolean) {
    const asset = assetFromFailure(failure)
    try {
      deps.report({
        tags: { error_type: 'chunk_load', recovery, release: deps.release,
          route: normalizeRoute(deps.route()), asset_type: asset?.endsWith('.css') ? 'css' : asset ? 'js' : 'module' },
        extra: { asset_pathname: asset, source: failure.source, retry_consumed: consumed, dirty_state: incidentDirty || deps.dirty() },
      })
    } catch { /* Telemetry must never prevent recovery. */ }
  }
  async function handle(failure: Failure, dirtyAtFailure = false) {
    if (!isVersionSkewError(failure)) return false
    if (state !== 'idle') return true
    incidentDirty = dirtyAtFailure
    let consumed = consumedInMemory
    try {
      consumed ||= deps.storage().getItem(RETRY_KEY) !== null
      // Persist the current incident separately, before flush or reload.
      deps.storage().setItem(INCIDENT_KEY, JSON.stringify({ release: deps.release, route: normalizeRoute(deps.route()) }))
    } catch {
      setState('storage_unavailable')
      report(failure, 'storage_unavailable', consumed)
      return true
    }
    if (consumed) {
      setState('failed_after_reload')
      report(failure, 'failed_after_reload', true)
      return true
    }
    if (dirtyAtFailure || deps.dirty()) {
      setState('blocked_dirty_state')
      report(failure, 'blocked_dirty_state', false)
      return true
    }
    try {
      deps.storage().setItem(RETRY_KEY, '1')
      if (deps.storage().getItem(RETRY_KEY) !== '1') throw new Error('Storage unavailable')
    } catch {
      setState('storage_unavailable')
      report(failure, 'storage_unavailable', false)
      return true
    }
    consumedInMemory = true
    setState('reloading')
    report(failure, 'reload_once', true)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        Promise.resolve().then(() => deps.flush()).catch(() => undefined),
        new Promise<void>(resolve => { timer = setTimeout(resolve, deps.flushTimeout ?? 800) }),
      ])
    } finally {
      clearTimeout(timer)
    }
    // A user may have started editing while the diagnostics/flush were running.
    if (dirtyAtFailure || deps.dirty()) {
      setState('blocked_dirty_state')
      report(failure, 'blocked_dirty_state', true)
    } else {
      deps.reload()
    }
    return true
  }
  return {
    handle,
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    acknowledgeHealthyRoute() {
      // Deliberately NEVER remove RETRY_KEY, even after a successful boot or manual refresh.
      if (state === 'idle') {
        try { deps.storage().removeItem(INCIDENT_KEY) } catch { /* Optional cleanup. */ }
      }
    },
  }
}

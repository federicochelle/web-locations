import * as Sentry from '@sentry/react'
import { assetFromFailure, errorMessage, isChunkCandidate } from './classify.ts'
import type { Failure, RecoverySource } from './classify.ts'
import { createRecoveryController } from './controller.ts'
import { hasUnsavedCriticalState, registerCriticalState } from './dirty-state.ts'
import { APP_RELEASE } from './release.ts'

export const recovery = createRecoveryController({
  release: APP_RELEASE,
  storage: () => window.sessionStorage,
  dirty: hasUnsavedCriticalState,
  route: () => window.location.pathname,
  report: report => { Sentry.captureEvent({ message: 'Application module could not be loaded', level: 'warning', ...report }) },
  flush: () => Sentry.flush(700),
  reload: () => window.location.reload(),
})

const pending = new WeakMap<object, Promise<boolean>>()
let installed = false

async function checkFailure(failure: Failure) {
  if (!isChunkCandidate(failure)) return false
  const dirtyAtFailure = hasUnsavedCriticalState()
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 1500)
  const options: RequestInit = { cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal }
  const asset = assetFromFailure(failure)
  try {
    // Read-only diagnostics, never retry a business request. Drop query/fragment before fetching.
    const [assetResponse, latestRelease] = await Promise.all([
      asset ? fetch(asset, { ...options, method: 'HEAD' }).catch(() => null) : null,
      fetch('/version.json', options).then(async response => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return
        const body: unknown = await response.json()
        if (body && typeof body === 'object' && 'release' in body && typeof body.release === 'string' &&
          /^(?:dpl_[A-Za-z0-9]+|git-[a-f0-9]{40,64}-[a-f0-9]{20})$/.test(body.release)) return body.release
      }).catch(() => undefined),
    ])
    return await recovery.handle({ ...failure, online: navigator.onLine,
      status: assetResponse?.status, contentType: assetResponse?.headers.get('content-type') ?? undefined,
      currentRelease: APP_RELEASE, latestRelease }, dirtyAtFailure)
  } finally {
    window.clearTimeout(timeout)
  }
}

export function handleModuleFailure(error: unknown, source: RecoverySource = 'dynamic_import', resource?: string, expectedType?: Failure['expectedType']) {
  if (error && typeof error === 'object') {
    const existing = pending.get(error)
    if (existing) return existing
  }
  const result = checkFailure({ error, source, resource, expectedType, origin: window.location.origin, online: navigator.onLine })
  if (error && typeof error === 'object') pending.set(error, result)
  return result
}

export async function recoverableImport<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load()
  } catch (error) {
    if (await handleModuleFailure(error)) {
      // Keep the lazy boundary suspended instead of tearing down the surrounding form/drawer.
      // The global notice remains mounted outside the router. Manual update is always available.
      return new Promise<T>(() => {})
    }
    if (isModuleLoadMessage(error)) throw new Error('No pudimos cargar esta parte de la aplicación. Intentá actualizar la página.')
    throw error
  }
}

export function isModuleLoadMessage(error: unknown) {
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|Failed to load module script|disallowed MIME type|Expected a JavaScript(?:-or-Wasm)? module script/i.test(errorMessage(error))
}

export function installVersionRecovery() {
  if (installed) return
  installed = true
  // Conservative fallback for short forms too. No field names or values are read.
  // A touched mounted form stays protected even after submit: success is not assumed.
  const touchedForms = new WeakSet<HTMLFormElement>()
  registerCriticalState(() => [...document.forms].some(form => touchedForms.has(form)))
  const touchForm = (event: Event) => {
    const target = event.target
    if (target instanceof Element) {
      const form = target.closest('form')
      if (form) touchedForms.add(form)
    }
  }
  document.addEventListener('input', touchForm, true)
  document.addEventListener('change', touchForm, true)
  document.addEventListener('submit', touchForm, true)
  window.addEventListener('vite:preloadError', event => {
    const error = (event as Event & { payload?: unknown }).payload
    // Let the original rejection reach recoverableImport. preventDefault here would make
    // Vite resolve undefined and cause an unrelated React.lazy / module-export error.
    void handleModuleFailure(error, 'vite:preloadError')
  })
  window.addEventListener('unhandledrejection', event => {
    void handleModuleFailure(event.reason)
  })
  window.addEventListener('error', event => {
    const target = event.target
    if (target instanceof HTMLScriptElement && target.type === 'module') {
      void handleModuleFailure(event, 'resource_error', target.src, 'module')
    } else if (target instanceof HTMLLinkElement && ['modulepreload', 'stylesheet'].includes(target.rel)) {
      void handleModuleFailure(event, 'resource_error', target.href, target.rel === 'stylesheet' ? 'css' : 'module')
    } else if (event.error) {
      void handleModuleFailure(event.error)
    }
  }, true)
}

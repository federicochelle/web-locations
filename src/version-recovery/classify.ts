export type RecoverySource = 'vite:preloadError' | 'dynamic_import' | 'resource_error'
export type Failure = {
  error?: unknown
  source: RecoverySource
  resource?: string
  expectedType?: 'js' | 'css' | 'module'
  origin: string
  online: boolean
  status?: number
  contentType?: string
  currentRelease?: string
  latestRelease?: string
}

const importMessage = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|Failed to load module script|disallowed MIME type|Expected a JavaScript(?:-or-Wasm)? module script/i

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : ''
}

export function safeAssetPath(resource: string | undefined, origin: string): string | undefined {
  if (!resource) return
  try {
    const url = new URL(resource, origin)
    // Only generated, same-origin Vite JS/CSS. Never keep signed URLs or user paths.
    if (url.origin === origin && /^\/assets\/[\w.-]+-[\w-]{8,}\.(?:js|css)$/.test(url.pathname)) {
      return url.pathname
    }
  } catch { /* Invalid URL is not evidence. */ }
}

export function assetFromFailure(failure: Failure): string | undefined {
  if (failure.resource) return safeAssetPath(failure.resource, failure.origin)
  const urls = errorMessage(failure.error).match(/https?:\/\/[^\s"'`<>]+|\/assets\/[^\s"'`<>]+/g) ?? []
  return urls.map(url => safeAssetPath(url, failure.origin)).find(Boolean)
}

export function isChunkCandidate(failure: Failure): boolean {
  if (!failure.online) return false
  const message = errorMessage(failure.error)
  const mentionedUrls = message.match(/https?:\/\/[^\s"'`<>]+/g) ?? []
  if (mentionedUrls.some(url => !safeAssetPath(url, failure.origin))) return false
  if (failure.resource && !safeAssetPath(failure.resource, failure.origin)) return false
  if (failure.source === 'resource_error') {
    return Boolean(failure.expectedType && assetFromFailure(failure))
  }
  // The Vite event can also carry evaluation/business errors: its name alone is insufficient.
  return importMessage.test(message)
}

export function isVersionSkewError(failure: Failure): boolean {
  if (!isChunkCandidate(failure)) return false
  const asset = assetFromFailure(failure)
  const missingAsset = asset && (failure.status === 404 || failure.status === 410)
  const htmlInsteadOfModule = asset && /^text\/html(?:;|$)/i.test(failure.contentType ?? '')
  const changedBuild = failure.currentRelease && failure.latestRelease &&
    failure.currentRelease !== failure.latestRelease
  return Boolean(missingAsset || htmlInsteadOfModule || changedBuild)
}

export function normalizeRoute(pathname: string): string {
  const known = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password',
    '/busqueda', '/terminos', '/privacidad', '/nosotros', '/postular-locacion', '/dashboard',
    '/profile', '/favorites', '/requests', '/requests/new', '/404'])
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/'
  if (known.has(path)) return path
  if (/^\/requests\/[^/]+$/.test(path)) return '/requests/:id'
  if (/^\/categorias\/[^/]+\/[^/]+$/.test(path)) return '/categorias/:category/:location'
  if (/^\/categorias\/[^/]+$/.test(path)) return '/categorias/:category'
  if (/^\/locations\/[^/]+$/.test(path)) return '/locations/:location'
  return '/other'
}

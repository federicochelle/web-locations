import * as Sentry from '@sentry/react'

import { APP_RELEASE } from './version-recovery/release.ts'
import { sanitizeForSentry } from './sentry-sanitize.ts'

export const SENTRY_CORRELATION_ID_HEADER = 'x-correlation-id'

export type OperationalContext = {
  action: string
  userId?: string | null
  locationId?: string | null
  requestProjectId?: string | null
  projectId?: string | null
  status?: string | number | null
  edgeFunction?: string | null
  rpc?: string | null
  table?: string | null
  httpStatus?: string | number | null
  errorCode?: string | number | null
  correlationId?: string | null
  extra?: Record<string, unknown>
}

type SentryUserInput = {
  id?: string | null
  email?: string | null
  name?: string | null
}

export function buildSentryUserPayload(user: SentryUserInput | null) {
  if (!user?.id) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? undefined,
    username: user.name ?? undefined,
  }
}

const TAG_KEYS = [
  'action',
  'userId',
  'locationId',
  'requestProjectId',
  'projectId',
  'status',
  'edgeFunction',
  'rpc',
  'table',
  'httpStatus',
  'errorCode',
  'correlationId',
] as const

function normalizeTag(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  return String(value).slice(0, 200)
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return 'Unknown operational error'
}

function getSentryEnvironment() {
  return (import.meta as ImportMeta & { env?: { MODE?: string } }).env?.MODE ?? 'unknown'
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return error
  }

  const normalizedError = new Error(getErrorMessage(error))

  if (error && typeof error === 'object') {
    const candidate = error as {
      code?: unknown
      name?: unknown
      status?: unknown
    }

    if (typeof candidate.name === 'string') {
      normalizedError.name = candidate.name
    }

    return Object.assign(normalizedError, {
      code: candidate.code,
      status: candidate.status,
    })
  }

  return normalizedError
}

export function buildOperationalErrorContext(error: unknown, context: OperationalContext) {
  const route = getCurrentRoutePathname()
  const environment = getSentryEnvironment()
  const safeContext = sanitizeForSentry({
    ...context,
    route,
    release: APP_RELEASE,
    environment,
    errorMessage: getErrorMessage(error),
  })
  const tags: Record<string, string> = {
    app: 'public-web',
    route,
    release: APP_RELEASE,
    environment,
  }

  for (const key of TAG_KEYS) {
    const tagValue = normalizeTag(safeContext[key])

    if (tagValue) {
      tags[key] = tagValue
    }
  }

  return { safeContext, tags }
}

export function createCorrelationId(prefix = 'web') {
  const randomId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  return `${prefix}-${randomId}`
}

export function getCurrentRoutePathname() {
  return typeof window === 'undefined' ? 'unknown' : window.location.pathname
}

export function configureSentryUser(user: SentryUserInput | null) {
  try {
    const sentryUser = buildSentryUserPayload(user)
    const authenticated = Boolean(sentryUser)

    Sentry.setTag('authenticated', authenticated ? 'true' : 'false')

    if (!sentryUser) {
      Sentry.setUser(null)
      return
    }

    Sentry.setUser(sentryUser)
  } catch {
    // Observability must never break application behavior.
  }
}

export function setSentryRouteContext(pathname = getCurrentRoutePathname()) {
  try {
    Sentry.setTag('app', 'public-web')
    Sentry.setTag('route', pathname)
    Sentry.setTag('release', APP_RELEASE)
    Sentry.setTag('environment', getSentryEnvironment())
    Sentry.setContext('app', {
      name: 'public-web',
      release: APP_RELEASE,
      environment: getSentryEnvironment(),
      route: pathname,
    })
  } catch {
    // Observability must never break application behavior.
  }
}

export function reportOperationalError(error: unknown, context: OperationalContext) {
  try {
    const normalizedError = normalizeError(error)
    const { safeContext, tags } = buildOperationalErrorContext(error, context)

    Sentry.withScope((scope) => {
      scope.setLevel('error')

      for (const [key, value] of Object.entries(tags)) {
        scope.setTag(key, value)
      }

      scope.setContext('operation', safeContext)
      Sentry.captureException(normalizedError)
    })
  } catch {
    // Observability must never break application behavior.
  }
}

export function getSupabaseErrorContext(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {}
  }

  const candidate = error as {
    code?: unknown
    status?: unknown
    context?: unknown
  }
  const context =
    candidate.context instanceof Response
      ? {
          httpStatus: candidate.context.status,
          correlationId:
            candidate.context.headers.get(SENTRY_CORRELATION_ID_HEADER) ??
            candidate.context.headers.get('x-request-id'),
        }
      : {}

  return {
    ...context,
    errorCode: candidate.code,
    status: candidate.status,
  }
}

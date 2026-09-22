import type { ErrorEvent } from '@sentry/react'

const REDACTED = '[redacted]'
const SENSITIVE_KEY_PATTERN =
  /authorization|cookie|password|passwd|pwd|token|secret|credential|signature|api[_-]?key|apikey|access[_-]?token|refresh[_-]?token|code|sig/i

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERN.test(key)
}

export function scrubSecrets(value: string): string {
  return value
    .replace(/([?&#](?:[^=&#\s]*(?:token|secret|password|credential|signature|api[_-]?key|apikey)[^=&#\s]*|access_token|refresh_token|code|key|sig)=)[^&#\s"'<>)]*/gi, `$1${REDACTED}`)
    .replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi, `$1${REDACTED}@`)
    .replace(/\bBearer\s+[\w.+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, REDACTED)
}

function sanitizeUrl(value: string) {
  const scrubbed = scrubSecrets(value)

  try {
    const url = new URL(scrubbed, 'https://redacted.invalid')

    for (const key of [...url.searchParams.keys()]) {
      if (isSensitiveKey(key)) {
        url.searchParams.set(key, REDACTED)
      }
    }

    if (url.hash && isSensitiveKey(url.hash)) {
      url.hash = ''
    }

    if (value.startsWith('http')) {
      return url.toString()
    }

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return scrubbed
  }
}

export function sanitizeForSentry<T>(value: T, depth = 0): T {
  if (depth > 5) {
    return '[max-depth]' as T
  }

  if (typeof value === 'string') {
    const scrubbed = scrubSecrets(value)

    if (/^(?:https?:)?\/\//i.test(scrubbed) || scrubbed.startsWith('/') || /[?#]/.test(scrubbed)) {
      return sanitizeUrl(scrubbed) as T
    }

    return scrubbed as T
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeForSentry(entry, depth + 1)) as T
  }

  const sanitizedEntries = Object.entries(value).map(([key, entry]) => {
    if (isSensitiveKey(key)) {
      return [key, REDACTED]
    }

    return [key, sanitizeForSentry(entry, depth + 1)]
  })

  return Object.fromEntries(sanitizedEntries) as T
}

export function sanitizeSentryEvent(event: ErrorEvent): ErrorEvent {
  const sanitized = sanitizeForSentry(event)

  if (sanitized.request?.url) {
    sanitized.request.url = sanitizeUrl(sanitized.request.url)
  }

  return sanitized
}

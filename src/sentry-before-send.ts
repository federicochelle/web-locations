import type { ErrorEvent, EventHint } from '@sentry/react'

import { sanitizeSentryEvent } from './sentry-sanitize.ts'
import { isModuleLoadMessage } from './version-recovery/browser.ts'
import { sanitizeRecoveryEvent } from './version-recovery/telemetry.ts'

export function processSentryBeforeSend(
  event: ErrorEvent,
  hint: EventHint,
  appRelease: string,
  environment: string,
  origin: string,
) {
  if (
    isModuleLoadMessage(hint.originalException) ||
    event.exception?.values?.some(value => isModuleLoadMessage(value.value))
  ) {
    return null
  }

  const sanitizedEvent = sanitizeSentryEvent(event)

  if (sanitizedEvent.tags?.error_type === 'chunk_load') {
    return sanitizeRecoveryEvent(sanitizedEvent, appRelease, environment, origin)
  }

  return sanitizedEvent
}

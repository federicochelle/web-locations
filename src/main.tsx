import { sanitizeRecoveryEvent } from './version-recovery/telemetry.ts'
import * as Sentry from '@sentry/react'
import { createPrivateReplay, privateReplayTransport } from './sentry-replay.ts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App.tsx'
import { APP_RELEASE } from './version-recovery/release.ts'
import { installVersionRecovery, isModuleLoadMessage } from './version-recovery/browser.ts'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim() || ''
const isSentryEnabled = import.meta.env.PROD && sentryDsn.length > 0

Sentry.init({
  dsn: sentryDsn,
  enabled: isSentryEnabled,
  environment: import.meta.env.MODE,
  release: APP_RELEASE,
  sendDefaultPii: false,
  integrations: isSentryEnabled ? [createPrivateReplay()] : [],
  transport: privateReplayTransport,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    if (event.tags?.error_type === 'chunk_load') {
      // SDK defaults may add URL, breadcrumbs, user or request data. Explicit allowlist.
      return sanitizeRecoveryEvent(event, APP_RELEASE, import.meta.env.MODE, window.location.origin)
    }
    // The dedicated report above replaces raw module errors (which may contain signed URLs).
    if (isModuleLoadMessage(hint.originalException) ||
      event.exception?.values?.some(value => isModuleLoadMessage(value.value))) return null
    return event
  },
})

installVersionRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

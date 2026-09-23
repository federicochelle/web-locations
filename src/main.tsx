import { init } from '@sentry/react'
import { configureSentryUser, setSentryRouteContext } from './sentry-observability.ts'
import { processSentryBeforeSend } from './sentry-before-send.ts'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App.tsx'
import { APP_RELEASE } from './version-recovery/release.ts'
import { installVersionRecovery } from './version-recovery/browser.ts'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim() || ''
const isSentryEnabled = import.meta.env.PROD && sentryDsn.length > 0

init({
  dsn: sentryDsn,
  enabled: isSentryEnabled,
  environment: import.meta.env.MODE,
  release: APP_RELEASE,
  sendDefaultPii: false,
  integrations: [],
  beforeSend(event, hint) {
    return processSentryBeforeSend(event, hint, APP_RELEASE, import.meta.env.MODE, window.location.origin)
  },
})

configureSentryUser(null)
setSentryRouteContext()
installVersionRecovery()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

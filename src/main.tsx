import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App.tsx'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim() || ''
const isSentryEnabled = import.meta.env.PROD && sentryDsn.length > 0

Sentry.init({
  dsn: sentryDsn,
  enabled: isSentryEnabled,
  environment: import.meta.env.MODE,
  sendDefaultPii: false,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

import type { ErrorEvent } from '@sentry/react'
import { normalizeRoute, safeAssetPath } from './classify.ts'

export function sanitizeRecoveryEvent(event: ErrorEvent, release: string, environment: string, origin: string): ErrorEvent {
  const tags = event.tags ?? {}
  const extra = event.extra ?? {}
  const recoveries = ['reload_once', 'blocked_dirty_state', 'failed_after_reload', 'storage_unavailable']
  const sources = ['vite:preloadError', 'dynamic_import', 'resource_error']
  return {
    type: undefined, event_id: event.event_id, timestamp: event.timestamp, platform: 'javascript',
    level: 'warning', message: 'Application module could not be loaded', release, environment,
    tags: {
      error_type: 'chunk_load', recovery: recoveries.includes(String(tags.recovery)) ? tags.recovery : 'storage_unavailable', release,
      route: normalizeRoute(typeof tags.route === 'string' ? tags.route : '/other'),
      asset_type: ['js', 'css', 'module'].includes(String(tags.asset_type)) ? tags.asset_type : 'module',
    },
    extra: {
      asset_pathname: safeAssetPath(typeof extra.asset_pathname === 'string' ? extra.asset_pathname : undefined, origin),
      source: sources.includes(String(extra.source)) ? extra.source : 'dynamic_import', retry_consumed: extra.retry_consumed === true, dirty_state: extra.dirty_state === true,
    },
  }
}

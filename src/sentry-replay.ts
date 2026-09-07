import { makeFetchTransport, replayIntegration } from '@sentry/react'
export type ReplayEnvelope = Parameters<ReturnType<typeof makeFetchTransport>['send']>[0]

export function createPrivateReplay() {
  return replayIntegration({
    maskAllText: false,
    maskAllInputs: false,
    blockAllMedia: false,
    unmask: [],
    unblock: [],
    block: [
      '[data-sentry-secret]', '[data-secret]', '[data-credentials]',
      'input[type="password"]', 'input[type="hidden"]',
      '[autocomplete="current-password"]', '[autocomplete="new-password"]',
      '[autocomplete="one-time-code"]', '[autocomplete="username"]',
      ...['password', 'token', 'secret', 'credential', 'api_key', 'apikey'].flatMap(name => [
        `input[name*="${name}" i]`, `textarea[name*="${name}" i]`,
        `input[id*="${name}" i]`, `textarea[id*="${name}" i]`,
      ]),
    ],
    maskAttributes: [],
    networkDetailAllowUrls: [],
    networkCaptureBodies: false,
    networkRequestHeaders: [],
    networkResponseHeaders: [],
    // Drop console, network, navigation and click breadcrumbs (including their payloads).
    beforeAddRecordingEvent: () => null,
    // v10's recording hook cannot scrub rrweb snapshots or their location.href.
    // Keep recordings readable by the transport privacy filter below.
    useCompression: false,
  })
}

// Preserve visual attributes, CSS and public image URLs. Scrub credentials in
// URLs (including password recovery links), bearer tokens and JWTs before sending.
function scrubSecrets(value: string): string {
  return value
    .replace(/([?&#](?:[^=&#\s]*(?:token|secret|password|credential|signature|api[_-]?key)[^=&#\s]*|code|key|sig)=)[^&#\s"'<>)]*/gi, '$1[redacted]')
    .replace(/(https?:\/\/)[^/@\s]+:[^/@\s]+@/gi, '$1[redacted]@')
    .replace(/\bBearer\s+[\w.+/=-]+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, '[redacted]')
}

function scrubRecordingValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubRecordingValue)
  if (typeof value === 'string') return scrubSecrets(value)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
    if (key === 'attributes' && entry && typeof entry === 'object' && !Array.isArray(entry)) {
      // Applies to initial DOM nodes and subsequent attribute mutations alike.
      return [key, Object.fromEntries(Object.entries(entry).map(([name, attribute]) => [
        name,
        /(?:token|secret|password|credential|authorization|api[_-]?key)/i.test(name)
          ? '' : scrubRecordingValue(attribute),
      ]))]
    }
    return [key, scrubRecordingValue(entry)]
  }))
}

/** Fail closed if a future SDK changes the uncompressed recording format. */
export function scrubReplayEnvelope(envelope: ReplayEnvelope): ReplayEnvelope | null {
  try {
    return [envelope[0], envelope[1].map(item => {
      if (item[0].type === 'replay_event') {
        const event = item[1] as Record<string, unknown>
        const allowed = ['type', 'event_id', 'timestamp', 'platform', 'release', 'environment',
          'sdk', 'replay_start_timestamp', 'replay_id', 'segment_id', 'replay_type', 'error_ids']
        return [item[0], Object.fromEntries(allowed.filter(key => key in event).map(key => [key, event[key]]))]
      }
      if (item[0].type !== 'replay_recording') return item
      if (typeof item[1] !== 'string') throw new Error('Unexpected Replay encoding')
      const separator = item[1].indexOf('\n')
      if (separator < 0) throw new Error('Missing Replay header')
      const header = JSON.parse(item[1].slice(0, separator))
      const events: unknown = JSON.parse(item[1].slice(separator + 1))
      if (!Array.isArray(events)) throw new Error('Unexpected Replay events')
      const payload = `${JSON.stringify(header)}\n${JSON.stringify(scrubRecordingValue(events))}`
      return [{ ...item[0], length: new TextEncoder().encode(payload).length }, payload]
    })] as ReplayEnvelope
  } catch {
    return null
  }
}

export const privateReplayTransport: typeof makeFetchTransport = options => {
  const transport = makeFetchTransport(options)
  return {
    ...transport,
    send(envelope) {
      const sanitized = scrubReplayEnvelope(envelope)
      return sanitized ? transport.send(sanitized) : Promise.resolve({})
    },
  }
}

import assert from 'node:assert/strict'
import test from 'node:test'
import type { ReplayEnvelope as Envelope } from '../src/sentry-replay.ts'
import { scrubReplayEnvelope } from '../src/sentry-replay.ts'

test('Replay strips private URLs, attributes and scope data while preserving error association', () => {
  const secret = 'private-person@example.com'
  const recording = JSON.stringify({ segment_id: 0 }) + '\n' + JSON.stringify([
    { type: 4, data: { href: `https://example.com/reset-password#${secret}`, width: 1280 } },
    { type: 2, data: { node: { attributes: { class: 'card', 'data-email': secret, href: secret,
      style: `width: 20px; background-image: url("https://private/${secret}")` } } } },
    { type: 3, data: { attributes: [{ id: 1, attributes: { title: secret, value: secret, 'data-phone': secret, hidden: null } }] } },
  ])
  const envelope: Envelope = [{}, [
    [{ type: 'replay_event' }, { type: 'replay_event', replay_id: 'replay-1', error_ids: ['error-1'],
      user: { email: secret }, urls: [secret], request: { url: secret }, extra: { secret }, tags: { secret } }],
    [{ type: 'replay_recording', length: 0 }, recording],
  ]]
  const result = scrubReplayEnvelope(envelope)!
  assert.ok(result)
  assert.ok(!JSON.stringify(result).includes(secret))
  assert.deepEqual(result[1][0][1], { type: 'replay_event', replay_id: 'replay-1', error_ids: ['error-1'] })
  const payload = result[1][1][1] as string
  assert.equal(result[1][1][0].length, new TextEncoder().encode(payload).length)
  assert.ok(payload.includes('card'))
  assert.ok(payload.includes('width: 20px'))
  assert.ok(payload.includes('redacted.invalid'))
})

test('Unexpected or compressed recordings are never sent unfiltered', () => {
  for (const payload of [new Uint8Array([1, 2]), 'invalid', '{}\n{}']) {
    assert.equal(scrubReplayEnvelope([{}, [[{ type: 'replay_recording' }, payload]]]), null)
  }
})

test('Existing error envelopes remain intact', () => {
  const envelope: Envelope = [{ event_id: 'error-1' }, [[{ type: 'event' }, { message: 'Test error' }]]]
  assert.deepEqual(scrubReplayEnvelope(envelope), envelope)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { getCurrentScope } from '@sentry/react'

import { processSentryBeforeSend } from '../src/sentry-before-send.ts'
import {
  buildSentryUserPayload,
  buildOperationalErrorContext,
  configureSentryUser,
  createCorrelationId,
  getSupabaseErrorContext,
  SENTRY_CORRELATION_ID_HEADER,
} from '../src/sentry-observability.ts'
import { sanitizeForSentry, sanitizeSentryEvent, scrubSecrets } from '../src/sentry-sanitize.ts'

function stringify(value: unknown) {
  return JSON.stringify(value)
}

test('sanitizes sensitive keys, auth headers, tokens and auth URLs', () => {
  const sanitized = sanitizeForSentry({
    Authorization: 'Bearer secret-access-token',
    cookie: 'session=private',
    nested: {
      access_token: 'abc123',
      url: 'https://example.com/reset-password?access_token=abc&refresh_token=def&next=/app#access_token=ghi',
      public: 'location-123',
    },
  })
  const output = stringify(sanitized)

  assert.ok(!output.includes('secret-access-token'))
  assert.ok(!output.includes('session=private'))
  assert.ok(!output.includes('abc123'))
  assert.ok(!output.includes('refresh_token=def'))
  assert.ok(output.includes('location-123'))
  assert.equal(sanitized.Authorization, '[redacted]')
  assert.equal(sanitized.cookie, '[redacted]')
})

test('scrubs secret-bearing strings without removing useful URL shape', () => {
  const scrubbed = scrubSecrets(
    'POST https://api.example.com/path?apikey=secret&status=500 Authorization: Bearer abc.def.ghi',
  )

  assert.ok(scrubbed.includes('https://api.example.com/path?apikey=[redacted]&status=500'))
  assert.ok(scrubbed.includes('Bearer [redacted]'))
  assert.ok(!scrubbed.includes('secret'))
})

test('beforeSend sanitizes events and drops raw module load reports', () => {
  const event = sanitizeSentryEvent({
    event_id: 'evt-1',
    request: {
      url: 'https://web.example.com/auth/callback?access_token=abc&code=secret-code',
      headers: {
        Authorization: 'Bearer private',
      },
    },
    breadcrumbs: [
      {
        category: 'fetch',
        data: {
          url: 'https://api.example.com/rpc?apikey=private',
          cookie: 'session=private',
        },
      },
    ],
  })
  const processed = processSentryBeforeSend(event, {}, 'git-test', 'test', 'https://web.example.com')

  assert.ok(processed)
  const output = stringify(processed)
  assert.ok(!output.includes('secret-code'))
  assert.ok(!output.includes('Bearer private'))
  assert.ok(!output.includes('session=private'))
  assert.ok(output.includes('[redacted]'))

  const dropped = processSentryBeforeSend(
    { exception: { values: [{ value: 'Failed to fetch dynamically imported module' }] } },
    {},
    'git-test',
    'test',
    'https://web.example.com',
  )
  assert.equal(dropped, null)
})

test('sets and clears Sentry user identity without PII beyond allowed fields', () => {
  const sentryUser = buildSentryUserPayload({
    id: 'user-1',
    email: 'user@example.com',
    name: 'User Name',
  })

  assert.deepEqual(sentryUser, {
    id: 'user-1',
    email: 'user@example.com',
    username: 'User Name',
  })
  assert.equal(buildSentryUserPayload(null), null)
  assert.equal(buildSentryUserPayload({ id: null, email: 'user@example.com' }), null)

  configureSentryUser({ id: 'user-1', email: 'user@example.com', name: 'User Name' })
  configureSentryUser(null)
  assert.deepEqual(getCurrentScope().getUser(), {})
})

test('generates correlation IDs and extracts Supabase response context', () => {
  const correlationId = createCorrelationId('search')
  assert.match(correlationId, /^search-/)

  const response = new Response(null, {
    status: 503,
    headers: {
      [SENTRY_CORRELATION_ID_HEADER]: 'edge-correlation-id',
    },
  })
  const context = getSupabaseErrorContext({
    code: 'functions_http_error',
    status: 'failed',
    context: response,
  })

  assert.deepEqual(context, {
    httpStatus: 503,
    correlationId: 'edge-correlation-id',
    errorCode: 'functions_http_error',
    status: 'failed',
  })
})

test('operational helper builds allowlisted, sanitized tags and context', () => {
  const { safeContext, tags } = buildOperationalErrorContext(new Error('boom'), {
    action: 'search.rpc.v4',
    rpc: 'search_public_locations_v4',
    httpStatus: 500,
    correlationId: 'corr-1',
    extra: {
      Authorization: 'Bearer private',
      url: 'https://example.com?refresh_token=private',
      queryLength: 12,
    },
  })

  assert.equal(tags.app, 'public-web')
  assert.equal(tags.environment, 'unknown')
  assert.equal(tags.action, 'search.rpc.v4')
  assert.equal(tags.rpc, 'search_public_locations_v4')
  assert.equal(tags.httpStatus, '500')
  assert.equal(tags.correlationId, 'corr-1')
  assert.ok(!stringify(safeContext).includes('Bearer private'))
  assert.ok(!stringify(safeContext).includes('refresh_token=private'))
  assert.equal(safeContext.extra?.queryLength, 12)
})

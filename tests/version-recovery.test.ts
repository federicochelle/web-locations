import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isVersionSkewError, isChunkCandidate, normalizeRoute } from '../src/version-recovery/classify.ts'
import type { Failure } from '../src/version-recovery/classify.ts'
import { createRecoveryController, INCIDENT_KEY, RETRY_KEY } from '../src/version-recovery/controller.ts'
import type { RecoveryReport } from '../src/version-recovery/controller.ts'
import { registerCriticalState, hasUnsavedCriticalState } from '../src/version-recovery/dirty-state.ts'
import { sanitizeRecoveryEvent } from '../src/version-recovery/telemetry.ts'

const origin = 'https://app.example'
const resource = `${origin}/assets/TermsPage-AbCd1234.js`
const failure: Failure = { origin, online: true, source: 'dynamic_import', error: new TypeError(`Failed to fetch dynamically imported module: ${resource}`), status: 404 }
const confirmed = { currentRelease: 'A', latestRelease: 'B' }
for (const message of ['Failed to fetch dynamically imported module', 'Importing a module script failed', 'error loading dynamically imported module']) {
  test(`classifies confirmed dynamic import: ${message}`, () => {
    assert.equal(isVersionSkewError({ ...failure, error: new TypeError(message), status: undefined, ...confirmed }), true)
    assert.equal(isVersionSkewError({ ...failure, error: new TypeError(message), status: undefined }), false)
  })
}
test('Vite event requires load evidence; does not classify arbitrary payloads', () => {
  assert.equal(isVersionSkewError({ ...failure, source: 'vite:preloadError' }), true)
  assert.equal(isVersionSkewError({ ...failure, source: 'vite:preloadError', error: new Error('Business rule violated'), ...confirmed }), false)
})
test('hashed own JS 404 and HTML MIME for JS/CSS modules', () => {
  assert.equal(isVersionSkewError({ ...failure, source: 'resource_error', resource, expectedType: 'module' }), true)
  for (const extension of ['js', 'css']) {
    assert.equal(isVersionSkewError({ ...failure, source: 'resource_error', expectedType: extension as 'js' | 'css',
      resource: resource.replace('.js', `.${extension}`), status: 200, contentType: 'text/html; charset=utf-8' }), true)
  }
  assert.equal(isVersionSkewError({ ...failure, source: 'vite:preloadError', resource: resource.replace('.js', '.css'),
    error: new Error('Unable to preload CSS'), status: 404 }), true)
})
for (const message of ['Supabase permission denied', 'API fetch failed: 500', 'CORS policy blocked request', 'React render failed', 'Failed to fetch']) {
  test(`ignores normal error: ${message}`, () => assert.equal(isVersionSkewError({ ...failure, error: new Error(message), ...confirmed }), false))
}
test('ignores external modules, unversioned assets, images and offline even with a deployment change', () => {
  for (const url of ['https://third.party/assets/chunk-AbCd1234.js', `${origin}/api/data`, `${origin}/assets/image-AbCd1234.png`, `${origin}/assets/plain.js`]) {
    assert.equal(isVersionSkewError({ ...failure, resource: url, ...confirmed }), false)
  }
  assert.equal(isVersionSkewError({ ...failure, online: false, ...confirmed }), false)
  assert.equal(isVersionSkewError({ ...failure, source: 'resource_error', resource, expectedType: undefined }), false)
})
test('a network failure without corroboration is only a candidate, never automatic recovery', () => {
  assert.equal(isChunkCandidate(failure), true)
  assert.equal(isVersionSkewError({ ...failure, status: 500 }), false)
  assert.equal(isVersionSkewError({ ...failure, status: 200, contentType: 'application/javascript' }), false)
})
function harness(options: { dirty?: boolean; blocked?: boolean; silentStorage?: boolean; flush?: () => Promise<unknown>; reportThrows?: boolean } = {}, values = new Map<string, string>()) {
  const events: RecoveryReport[] = []
  let reloads = 0
  let dirty = options.dirty ?? false
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (!options.silentStorage) values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
  const controller = createRecoveryController({
    release: 'build-A', storage: () => { if (options.blocked) throw new Error('Denied'); return storage },
    dirty: () => dirty, route: () => '/requests/private-id?token=SECRET',
    report: event => {
      events.push(event)
      if (event.tags.recovery === 'reload_once') assert.equal(values.get(RETRY_KEY), '1')
      if (options.reportThrows) throw new Error('Sentry failed')
    },
    flush: options.flush ?? (async () => {}), flushTimeout: 10,
    reload: () => { reloads++ },
  })
  return { controller, values, events, get reloads() { return reloads }, setDirty: (next: boolean) => { dirty = next } }
}
test('first failure records before async work and concurrent failures reload only once', async () => {
  const h = harness()
  await Promise.all([h.controller.handle(failure), h.controller.handle(failure)])
  assert.equal(h.reloads, 1)
  assert.equal(h.events.length, 1)
  assert.equal(h.events[0].tags.recovery, 'reload_once')
  assert.equal(h.values.has(INCIDENT_KEY), true)
})
test('a fresh controller after reload never restores the budget, including after healthy boot', async () => {
  const a = harness(); await a.controller.handle(failure)
  const b = harness({}, a.values)
  b.controller.acknowledgeHealthyRoute()
  assert.equal(b.values.has(INCIDENT_KEY), false)
  assert.equal(b.values.get(RETRY_KEY), '1')
  await b.controller.handle(failure)
  assert.equal(b.reloads, 0)
  assert.equal(b.controller.getSnapshot(), 'failed_after_reload')
  assert.equal(b.events[0].tags.recovery, 'failed_after_reload')
})
test('dirty state blocks reload without consuming a retry', async () => {
  const h = harness({ dirty: true }); await h.controller.handle(failure)
  assert.equal(h.reloads, 0)
  assert.equal(h.controller.getSnapshot(), 'blocked_dirty_state')
  assert.equal(h.events[0].extra.dirty_state, true)
  assert.equal(h.values.has(RETRY_KEY), false)
})
test('dirty snapshot survives teardown and dirty changes during flush block reload', async () => {
  const a = harness(); await a.controller.handle(failure, true)
  assert.equal(a.reloads, 0)
  assert.equal(a.events[0].extra.dirty_state, true)
  const b = harness({ flush: async () => { b.setDirty(true) } })
  await b.controller.handle(failure)
  assert.equal(b.reloads, 0)
  assert.equal(b.controller.getSnapshot(), 'blocked_dirty_state')
  assert.equal(b.values.get(RETRY_KEY), '1')
})
for (const options of [{ blocked: true }, { silentStorage: true }]) {
  test(`unavailable storage is manual: ${JSON.stringify(options)}`, async () => {
    const h = harness(options); await h.controller.handle(failure); await h.controller.handle(failure)
    assert.equal(h.reloads, 0)
    assert.equal(h.controller.getSnapshot(), 'storage_unavailable')
  })
}
for (const flush of [async () => { throw new Error('failed') }, () => new Promise(() => {})]) {
  test('telemetry exception or hanging flush never blocks recovery', async () => {
    const h = harness({ flush, reportThrows: true }); await h.controller.handle(failure)
    assert.equal(h.reloads, 1)
  })
}
test('negative errors never report, consume storage or reload', async () => {
  const h = harness(); assert.equal(await h.controller.handle({ ...failure, error: new Error('API 500') }), false)
  assert.equal(h.events.length, 0); assert.equal(h.values.size, 0); assert.equal(h.reloads, 0)
})
test('report excludes original exception, URL credentials, query, IDs and form data', async () => {
  const h = harness()
  await h.controller.handle({ ...failure, error: new Error(`Failed to fetch dynamically imported module: ${resource}?token=SECRET#email=person@example.com`) })
  const serialized = JSON.stringify(h.events)
  for (const secret of ['SECRET', 'private-id', 'person@', 'token=', 'https://']) assert.equal(serialized.includes(secret), false)
  assert.equal(h.events[0].tags.route, '/requests/:id')
})
test('Sentry final allowlist strips automatically attached sensitive metadata', () => {
  const result = sanitizeRecoveryEvent({ type: undefined,
    request: { url: '/?token=SECRET', cookies: { token: 'SECRET' }, data: 'SECRET' },
    breadcrumbs: [{ message: 'SECRET' }], user: { email: 'SECRET' }, contexts: { custom: { token: 'SECRET' } },
    exception: { values: [{ value: 'SECRET' }] }, message: 'SECRET',
    tags: { error_type: 'chunk_load', recovery: 'reload_once', route: '/requests/private-id?token=SECRET', asset_type: 'js', email: 'SECRET' },
    extra: { asset_pathname: `${resource}?token=SECRET`, source: 'dynamic_import', retry_consumed: true, body: 'SECRET' },
  }, 'build-A', 'test', origin)
  assert.equal(JSON.stringify(result).includes('SECRET'), false)
  assert.equal(result.extra?.asset_pathname, '/assets/TermsPage-AbCd1234.js')
  assert.equal(result.tags?.route, '/requests/:id')
})
test('dirty registry aggregates and unregisters without collecting form values', () => {
  const clean = registerCriticalState(() => false)
  const dirty = registerCriticalState(() => true)
  assert.equal(hasUnsavedCriticalState(), true)
  dirty(); assert.equal(hasUnsavedCriticalState(), false); clean()
})
test('routes normalize identifiers and unknown paths', () => {
  assert.equal(normalizeRoute('/categorias/casas/location-private'), '/categorias/:category/:location')
  assert.equal(normalizeRoute('/some-email@example.com'), '/other')
})

test('build identification prefers deployment ID, is deterministic and changes with real inputs', async () => {
  const { resolveBuildRelease } = await import('../scripts/build-release.ts')
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const root = mkdtempSync(join(tmpdir(), 'release-test-'))
  const previousDeployment = process.env.VERCEL_DEPLOYMENT_ID
  const previousSha = process.env.VERCEL_GIT_COMMIT_SHA
  try {
    process.env.VERCEL_DEPLOYMENT_ID = 'dpl_Example123'
    assert.equal(resolveBuildRelease(root, {}, 'production'), 'dpl_Example123')
    delete process.env.VERCEL_DEPLOYMENT_ID
    process.env.VERCEL_GIT_COMMIT_SHA = 'a'.repeat(40)
    for (const dir of ['src', 'public', 'scripts']) mkdirSync(join(root, dir))
    for (const file of ['index.html', 'logo.webp', 'vite.config.ts', 'scripts/build-release.ts', 'package-lock.json', 'src/main.ts']) writeFileSync(join(root, file), 'A')
    const a = resolveBuildRelease(root, { VITE_VALUE: 'one' }, 'production')
    assert.equal(resolveBuildRelease(root, { VITE_VALUE: 'one' }, 'production'), a)
    writeFileSync(join(root, 'src/main.ts'), 'B')
    assert.notEqual(resolveBuildRelease(root, { VITE_VALUE: 'one' }, 'production'), a)
    assert.notEqual(resolveBuildRelease(root, { VITE_VALUE: 'two' }, 'production'), a)
    delete process.env.VERCEL_GIT_COMMIT_SHA
    assert.throws(() => resolveBuildRelease(root, {}, 'production'), /Cannot identify build/)
  } finally {
    if (previousDeployment === undefined) delete process.env.VERCEL_DEPLOYMENT_ID
    else process.env.VERCEL_DEPLOYMENT_ID = previousDeployment
    if (previousSha === undefined) delete process.env.VERCEL_GIT_COMMIT_SHA
    else process.env.VERCEL_GIT_COMMIT_SHA = previousSha
    rmSync(root, { recursive: true })
  }
})

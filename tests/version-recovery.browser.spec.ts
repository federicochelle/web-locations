import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function isolate(page: Page) {
  const reports: Array<{ tags: Record<string, string>; release?: string; request?: unknown; breadcrumbs?: unknown; user?: unknown }> = []
  // No real backend operations or Sentry messages during this suite.
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') return route.continue()
    if (url.pathname.includes('/envelope/')) {
      for (const line of (route.request().postData() ?? '').split('\n')) {
        try { const event = JSON.parse(line); if (event.tags?.error_type === 'chunk_load') reports.push(event) } catch { /* Envelope framing. */ }
      }
      return route.fulfill({ status: 200, body: '{}' })
    }
    if (url.hostname.endsWith('.supabase.co')) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    return route.abort()
  })
  return reports
}

test('direct SPA URLs, missing assets and existing JS/CSS MIME', async ({ request }) => {
  const index = await (await request.get('/')).text()
  for (const url of ['/busqueda', '/profile', '/requests', '/requests/new', '/requests/example', '/categorias/casas', '/assets-other']) {
    const response = await request.get(url)
    expect(response.status()).toBe(200)
    expect(await response.text()).toBe(index)
  }
  for (const url of ['/assets/no-existe.js', '/assets/no-existe.css', '/assets/nested/no-existe.js', '/assets', '/assets/']) {
    const response = await request.get(url)
    expect(response.status()).toBe(404)
    expect(response.headers()['content-type']).not.toContain('text/html')
    expect(await response.text()).not.toContain('<!doctype html>')
  }
  const js = index.match(/src="([^\"]+\.js)"/)![1]
  const css = index.match(/href="([^\"]+\.css)"/)![1]
  expect((await request.get(js)).headers()['content-type']).toContain('javascript')
  expect((await request.get(css)).headers()['content-type']).toContain('text/css')
  expect((await request.get('/version.json')).headers()['content-type']).toContain('application/json')
})

test('first missing lazy chunk reloads once; a persistent second failure is manual', async ({ page }) => {
  const reports = await isolate(page)
  let documents = 0
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++ })
  await page.route('**/assets/TermsPage-*.js', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' }))
  await page.goto('/')
  await page.locator('a[href="/terminos"]').first().click()
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar esta parte de la aplicación')
  expect(documents).toBe(2)
  await page.waitForTimeout(1800)
  expect(documents).toBe(2)
  expect(await page.evaluate(() => sessionStorage.getItem('version-recovery:reload-consumed:v1'))).toBe('1')
  await expect(page.getByRole('button', { name: 'Actualizar ahora' })).toBeVisible()
  // With a DSN enabled in the production build, inspect the actual outgoing envelope locally.
  await expect.poll(() => reports.map(event => event.tags.recovery)).toEqual(['reload_once', 'failed_after_reload'])
  for (const report of reports) {
    expect(report.release).toMatch(/^(git-|dpl_)/)
    expect(report.request).toBeUndefined()
    expect(report.breadcrumbs).toBeUndefined()
    expect(report.user).toBeUndefined()
  }
})

test('healthy fresh load after the first failure keeps the consumed budget', async ({ page }) => {
  await isolate(page)
  let documents = 0
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents++ })
  await page.route('**/assets/TermsPage-*.js', route => documents === 1
    ? route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' }) : route.continue())
  await page.goto('/')
  await page.locator('a[href="/terminos"]').first().click()
  await expect(page).toHaveURL(/\/terminos$/)
  await expect(page.getByRole('heading', { name: /t[eé]rminos/i }).first()).toBeVisible()
  expect(documents).toBe(2)
  expect(await page.evaluate(() => sessionStorage.getItem('version-recovery:reload-consumed:v1'))).toBe('1')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('critical submission data survives a module resource failure; manual update asks before discarding', async ({ page }) => {
  await isolate(page)
  await page.goto('/postular-locacion')
  const field = page.locator('input:not([type=hidden])').first()
  await field.fill('Trabajo importante de prueba')
  let navigations = 0
  page.on('request', request => { if (request.isNavigationRequest()) navigations++ })
  await page.evaluate(() => {
    const script = document.createElement('script')
    script.type = 'module'; script.src = '/assets/Probe-AbCd1234.js'; document.head.append(script)
  })
  await expect(page.getByRole('alert').filter({ hasText: 'Guardá tu trabajo' })).toBeVisible()
  await expect(field).toHaveValue('Trabajo importante de prueba')
  expect(navigations).toBe(0)
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Actualizar ahora' }).click()
  await expect(field).toHaveValue('Trabajo importante de prueba')
  expect(navigations).toBe(0)
})

test('blocked sessionStorage uses manual recovery', async ({ page }) => {
  await isolate(page)
  await page.addInitScript(() => Object.defineProperty(window, 'sessionStorage', { get() { throw new Error('Blocked') } }))
  await page.route('**/assets/TermsPage-*.js', route => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not found' }))
  await page.goto('/')
  await page.locator('a[href="/terminos"]').first().click()
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar esta parte de la aplicación')
  await expect(page.getByRole('button', { name: 'Actualizar ahora' })).toBeVisible()
})

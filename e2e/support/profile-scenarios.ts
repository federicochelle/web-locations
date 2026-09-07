import { expect, test, type Page } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), 'VITE_')
const supabaseUrl = env.VITE_SUPABASE_URL
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
const userId = '11111111-1111-4111-8111-111111111111'
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'mock@example.invalid',
  app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
const profile = { id: '22222222-2222-4222-8222-222222222222', user_id: userId,
  full_name: 'Cuenta de prueba', company_name: null, production_company_id: null,
  phone: null, role: 'visitor', status: 'active' }

type Scenario = {
  guest?: boolean
  state?: 'ready' | 'missing' | 'error' | 'blocked' | 'inactive' | 'duplicate' | 'network'
  subscriptionError?: boolean
  companyError?: boolean
  hold?: Promise<void>
  logoutError?: boolean
}

async function mockAccount(page: Page, scenario: Scenario = {}) {
  let profileRequests = 0
  let logoutRequests = 0
  let privateRequests = 0
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(({ storageKey, user, guest }) => {
    // Seed only once so a reload can verify that logout removed the session.
    if (sessionStorage.getItem('mock-auth-seeded')) return
    sessionStorage.setItem('mock-auth-seeded', '1')
    if (!guest) localStorage.setItem(storageKey, JSON.stringify({
      access_token: 'mock-access-token', refresh_token: 'mock-refresh-token',
      token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user,
    }))
  }, { storageKey, user, guest: scenario.guest })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== new URL(supabaseUrl).origin) {
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue()
      return route.abort()
    }
    if (url.pathname.endsWith('/logout')) {
      logoutRequests++
      return route.fulfill({ status: scenario.logoutError ? 500 : 204,
        body: scenario.logoutError ? JSON.stringify({ message: 'Mock logout unavailable' }) : '' })
    }
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user })
    if (url.pathname.endsWith('/profiles')) {
      profileRequests++
      await scenario.hold
      if (scenario.state === 'network') return route.abort('failed')
      if (scenario.state === 'error') return route.fulfill({ status: 503, json: { code: 'MOCK_UNAVAILABLE', message: 'Mock service unavailable' } })
      const rows = scenario.state === 'missing' ? [] : [{ ...profile,
        status: scenario.state === 'blocked' || scenario.state === 'inactive' ? scenario.state : 'active',
        production_company_id: scenario.companyError ? '33333333-3333-4333-8333-333333333333' : null }]
      return route.fulfill({ json: scenario.state === 'duplicate' ? [profile, profile] : rows })
    }
    if (url.pathname.endsWith('/subscriptions') || url.pathname.endsWith('/get_my_production_company')) {
      if (scenario.subscriptionError || scenario.companyError) {
        return route.fulfill({ status: 503, json: { code: 'MOCK_DEPENDENCY', message: 'Mock dependency unavailable' } })
      }
      return route.fulfill({ json: [] })
    }
    if (/request_project|favorites/.test(url.pathname)) privateRequests++
    if (route.request().method() !== 'GET' && !url.pathname.includes('/rpc/')) {
      return route.abort()
    }
    return route.fulfill({ json: [] })
  })
  return { scenario, errors, profileRequests: () => profileRequests,
    logoutRequests: () => logoutRequests, privateRequests: () => privateRequests }
}

export function profileScenarios() {
  test('guest: Cuenta redirige a login', async ({ page }) => {
    await mockAccount(page, { guest: true })
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
  })

  test('perfil válido y reload muestran Cuenta', async ({ page }) => {
    const mock = await mockAccount(page)
    await page.goto('/profile')
    await expect(page.locator('input[value="Cuenta de prueba"]')).toBeVisible()
    await page.reload()
    await expect(page.locator('input[value="Cuenta de prueba"]')).toBeVisible()
    expect(mock.errors).toEqual([])
  })

  for (const path of ['/profile', '/favorites', '/requests', '/login']) {
    test(`perfil ausente: recuperación en ${path}`, async ({ page }) => {
      const mock = await mockAccount(page, { state: 'missing' })
      await page.goto(path)
      await expect(page.getByRole('heading', { name: 'No pudimos encontrar tu perfil' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible()
      await expect(page.locator('#selection-drawer-trigger')).toHaveCount(0)
      expect(mock.privateRequests()).toBe(0)
      expect(mock.errors).toEqual([])
    })
  }

  test('logout desde recuperación limpia persistencia y permite recargar como guest', async ({ page }) => {
    const mock = await mockAccount(page, { state: 'missing' })
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page).toHaveURL(/\/(?:login)?$/)
    expect(mock.logoutRequests()).toBe(1)
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull()
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login$/)
    expect(mock.errors).toEqual([])
  })

  test('logout fallido conserva sesión y muestra una acción recuperable', async ({ page }) => {
    const mock = await mockAccount(page, { state: 'missing', logoutError: true })
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page.getByRole('alert')).toHaveText('No pudimos cerrar la sesión. Intentá nuevamente.')
    await expect(page).toHaveURL(/\/profile$/)
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).not.toBeNull()
    mock.scenario.logoutError = false
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page).toHaveURL(/\/(?:login)?$/)
  })

  for (const state of ['error', 'network', 'duplicate'] as const) {
    test(`${state}: error temporal sin logout y retry exitoso`, async ({ page }) => {
      const mock = await mockAccount(page, { state })
      await page.goto('/profile')
      await expect(page.getByRole('heading', { name: 'No pudimos cargar tu cuenta' })).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('No pudimos encontrar tu perfil')).toHaveCount(0)
      expect(mock.logoutRequests()).toBe(0)
      mock.scenario.state = 'ready'
      await page.getByRole('button', { name: 'Reintentar' }).click()
      await expect(page.locator('input[value="Cuenta de prueba"]')).toBeVisible()
      expect(mock.errors).toEqual([])
    })
  }

  for (const dependency of ['subscriptionError', 'companyError'] as const) {
    test(`${dependency}: conserva el perfil válido`, async ({ page }) => {
      const mock = await mockAccount(page, { [dependency]: true })
      await page.goto('/profile')
      await expect(page.locator('input[value="Cuenta de prueba"]')).toBeVisible()
      await expect(page.locator('#selection-drawer-trigger')).toBeVisible()
      expect(mock.errors).toEqual([])
    })
  }

  for (const state of ['blocked', 'inactive'] as const) {
    test(`${state}: acceso no disponible y trigger oculto`, async ({ page }) => {
      const mock = await mockAccount(page, { state })
      await page.goto('/profile')
      await expect(page.getByRole('heading', { name: 'Acceso no disponible' })).toBeVisible()
      await expect(page.locator('#selection-drawer-trigger')).toHaveCount(0)
      await expect(page.locator('input[value="Cuenta de prueba"]')).toHaveCount(0)
      expect(mock.privateRequests()).toBe(0)
    })
  }

  test('Sentry clasifica missing, deduplica reintentos y limpia UUID al salir', async ({ page }) => {
    let release!: () => void
    const hold = new Promise<void>(resolve => { release = resolve })
    const mock = await mockAccount(page, { state: 'missing', hold })
    await page.goto('/profile')
    await expect.poll(mock.profileRequests).toBeGreaterThan(0)
    await page.evaluate(async () => {
      const source = await fetch('/src/providers/AuthProvider.tsx').then(response => response.text())
      const modulePath = source.match(/from ["']([^"']*sentry[^"']*)["']/)?.[1]
      if (!modulePath) throw new Error('Sentry module not found in Vite output')
      const sentry = await import(modulePath)
      const events: unknown[] = []
      Object.assign(window, { authTestSentry: sentry, authTestEvents: events })
      sentry.init({
        dsn: 'https://public@example.invalid/1', defaultIntegrations: [], sendDefaultPii: false,
        transport: () => ({ send: async (envelope: [unknown, [unknown, unknown][]]) => {
          events.push(...envelope[1].map(item => item[1]))
          return {}
        }, flush: async () => true }),
      })
    })
    release()
    await expect(page.getByRole('heading', { name: 'No pudimos encontrar tu perfil' })).toBeVisible()
    const sentryState = () => page.evaluate(async () => {
      const state = window as unknown as {
        authTestSentry: { flush: () => Promise<boolean>; getCurrentScope: () => { getUser: () => unknown } }
        authTestEvents: { message: string; user: unknown; tags: { auth_state: string; route: string } }[]
      }
      await state.authTestSentry.flush()
      return { events: state.authTestEvents, user: state.authTestSentry.getCurrentScope().getUser() }
    })
    await page.getByRole('button', { name: 'Reintentar' }).click()
    await expect(page.getByRole('heading', { name: 'No pudimos encontrar tu perfil' })).toBeVisible()
    const captured = await sentryState()
    expect(captured.events).toHaveLength(1)
    expect(captured.events[0]).toMatchObject({ message: 'authenticated_user_without_profile',
      user: { id: userId }, tags: { auth_state: 'missing', route: '/profile' } })
    expect(captured.events[0].user).toEqual({ id: userId })
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
    await expect(page).toHaveURL(/\/(?:login)?$/)
    expect((await sentryState()).user).toEqual({})
  })

  test('loading no monta Cuenta ni trigger; logout invalida respuestas anteriores', async ({ page }) => {
    let release!: () => void
    const hold = new Promise<void>(resolve => { release = resolve })
    const mock = await mockAccount(page, { hold })
    await page.goto('/profile')
    await expect.poll(mock.profileRequests).toBeGreaterThan(0)
    await expect(page.getByText('Cargando tu sesión...')).toBeVisible()
    await expect(page.locator('input[value="Cuenta de prueba"]')).toHaveCount(0)
    await expect(page.locator('#selection-drawer-trigger')).toHaveCount(0)
    // Exercise the real SDK SIGNED_OUT event while the profile request is pending.
    await page.evaluate(async () => {
      const modulePath = '/src/lib/supabase.ts'
      const { supabase } = await import(modulePath)
      await supabase.auth.signOut()
    })
    release()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Iniciar sesión', exact: true })).toBeVisible()
    await expect(page.locator('input[value="Cuenta de prueba"]')).toHaveCount(0)
    expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull()
    expect(mock.errors).toEqual([])
  })
}

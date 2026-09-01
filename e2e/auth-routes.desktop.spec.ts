import type { Page } from '@playwright/test'

import { expectNoVisibleLoaders } from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

const PERSISTED_PROJECT_CONTEXT_KEY = 'selection-active-context:v1'

async function seedPersistedProjectContext(page: Page) {
  await page.addInitScript((storageKey) => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        mode: 'project',
        projectId: '00000000-0000-0000-0000-000000000000',
      }),
    )
  }, PERSISTED_PROJECT_CONTEXT_KEY)
}

test('/login renderiza y valida campos vacíos o inválidos sin usar credenciales reales', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/login')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible()
  await expect(page.getByPlaceholder('Ingresá tu contraseña')).toBeVisible()

  await page.getByRole('button', { name: /Iniciar sesión/i }).click()
  await expect(page.getByText('Ingresá tu correo electrónico.')).toBeVisible()
  await expect(page.getByText('Ingresá tu contraseña.')).toBeVisible()

  await page.locator('form').evaluate((form) => {
    form.setAttribute('novalidate', 'true')
  })
  await page.getByPlaceholder('tu@email.com').fill('correo-invalido')
  await page.getByPlaceholder('Ingresá tu contraseña').fill('demo')
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()

  await expect(page.getByText('Ingresá un correo electrónico válido.')).toBeVisible()
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('rutas públicas no rehidratan un proyecto persistido sin sesión', async ({
  page,
  diagnostics,
}) => {
  await seedPersistedProjectContext(page)

  for (const path of ['/forgot-password', '/login', '/register', '/reset-password', '/terminos']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: /Ocurrió un problema/i })).not.toBeVisible()

    await expect
      .poll(() => page.evaluate((storageKey) => window.localStorage.getItem(storageKey), PERSISTED_PROJECT_CONTEXT_KEY))
      .toBe(JSON.stringify({ mode: 'new' }))
  }

  await page.reload()
  await expect(page.getByRole('heading', { name: /Ocurrió un problema/i })).not.toBeVisible()
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('rutas protegidas redirigen al login sin sesión y preservan el destino en history.state', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/profile?tab=security#password')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()

  const historyState = await page.evaluate(() => window.history.state)

  expect(historyState?.usr?.from?.pathname).toBe('/profile')
  expect(historyState?.usr?.from?.search).toBe('?tab=security')
  expect(historyState?.usr?.from?.hash).toBe('#password')

  await page.goto('/requests/new?source=guard#draft')
  await expect(page).toHaveURL(/\/login$/)

  const secondHistoryState = await page.evaluate(() => window.history.state)

  expect(secondHistoryState?.usr?.from?.pathname).toBe('/requests/new')
  expect(secondHistoryState?.usr?.from?.search).toBe('?source=guard')
  expect(secondHistoryState?.usr?.from?.hash).toBe('#draft')

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('/404 y rutas inexistentes resuelven al not found sin disparar RouteErrorBoundary', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/404')
  await expect(page).toHaveURL(/\/404$/)
  await expect(page.getByRole('heading', { name: /Página no encontrada/i })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: /Página no encontrada/i })).toBeVisible()

  await page.goto('/ruta-que-no-existe-playwright')
  await expect(page).toHaveURL(/\/404$/)
  await expect(page.getByRole('heading', { name: /Página no encontrada/i })).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

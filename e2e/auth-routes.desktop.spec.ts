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

async function expectPrivateRouteRedirect(
  page: Page,
  path: string,
) {
  const targetUrl = new URL(path, 'https://example.test')

  await page.goto(path)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()

  const historyState = await page.evaluate(() => window.history.state)

  expect(historyState?.usr?.from?.pathname).toBe(targetUrl.pathname)
  expect(historyState?.usr?.from?.search).toBe(targetUrl.search)
  expect(historyState?.usr?.from?.hash).toBe(targetUrl.hash)

  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
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

test('/register valida campos locales sin crear una cuenta', async ({ page, diagnostics }) => {
  await page.goto('/register')

  await expect(page.getByRole('heading', { name: /Crear cuenta/i })).toBeVisible()
  await page.getByRole('button', { name: /Crear cuenta/i }).click()
  await expect(page.getByText('Ingresá tu nombre completo.')).toBeVisible()
  await expect(page.getByText('Ingresá el nombre de tu productora.')).toBeVisible()
  await expect(page.getByText('Ingresá tu correo electrónico.')).toBeVisible()
  await expect(page.getByText('Ingresá una contraseña.')).toBeVisible()
  await expect(page.getByText('Confirmá tu contraseña.')).toBeVisible()
  await expect(page.getByText('Debés aceptar los Términos y Condiciones y la Política de Privacidad.')).toBeVisible()

  await page.locator('form').evaluate((form) => {
    form.setAttribute('novalidate', 'true')
  })
  await page.getByPlaceholder('Tu nombre completo').fill('Cuenta E2E')
  await page.getByPlaceholder('Nombre de tu productora').fill('Productora E2E')
  await page.getByPlaceholder('tu@email.com').fill('correo-invalido')
  await page.getByPlaceholder(/Mínimo 8 caracteres/i).fill('1234567')
  await page.getByPlaceholder('Repetí tu contraseña').fill('otra-clave')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: /Crear cuenta/i }).click()

  await expect(page.getByText('Ingresá un correo electrónico válido.')).toBeVisible()
  await expect(page.getByText(/La contraseña debe tener al menos 8 caracteres/i)).toBeVisible()
  await expect(page.getByText(/Las contraseñas no coinciden/i)).toBeVisible()

  await page.getByPlaceholder('tu@email.com').fill('e2e@example.invalid')
  await page.getByPlaceholder(/Mínimo 8 caracteres/i).fill('clave-segura')
  await page.getByPlaceholder('Repetí tu contraseña').fill('clave-segura')
  await page.getByRole('checkbox').uncheck()
  await page.getByRole('button', { name: /Crear cuenta/i }).click()
  await expect(page.getByText('Debés aceptar los Términos y Condiciones y la Política de Privacidad.')).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('/forgot-password valida email sin solicitar un enlace', async ({ page, diagnostics }) => {
  await page.goto('/forgot-password')

  await expect(page.getByRole('heading', { name: /Recuperar contraseña/i })).toBeVisible()
  await page.getByRole('button', { name: /Enviar enlace/i }).click()
  await expect(page.getByText('Ingresá tu correo electrónico.')).toBeVisible()

  await page.locator('form').evaluate((form) => {
    form.setAttribute('novalidate', 'true')
  })
  await page.getByPlaceholder('tu@email.com').fill('correo-invalido')
  await page.getByRole('button', { name: /Enviar enlace/i }).click()
  await expect(page.getByText('Ingresá un correo electrónico válido.')).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('/reset-password sin enlace muestra un estado inválido seguro sin editar contraseña', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/reset-password')

  await expect(page.getByRole('heading', { name: /Enlace no válido/i })).toBeVisible()
  await expect(page.getByText('El enlace no es válido o expiró. Solicitá uno nuevo.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Solicitar nuevo enlace/i })).toBeVisible()
  await expect(page.getByPlaceholder(/Mínimo 8 caracteres/i)).toHaveCount(0)

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
  for (const path of [
    '/profile?tab=security#password',
    '/favorites?source=guard#saved',
    '/requests?source=guard#drafts',
    '/dashboard?source=guard#overview',
    '/requests/new?source=guard#draft',
    '/locations/e2e-protected-route?source=guard#detail',
  ]) {
    await expectPrivateRouteRedirect(page, path)
  }

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

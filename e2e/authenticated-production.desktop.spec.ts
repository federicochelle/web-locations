import { expectNoVisibleLoaders } from './support/app'
import {
  getE2ECredentials,
  loginWithE2EAccount,
  logoutWithE2EAccount,
} from './support/auth'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

const credentials = getE2ECredentials()

// Auth artifacts may contain typed passwords, so this production-only suite keeps none.
test.use({
  screenshot: 'off',
  trace: 'off',
  video: 'off',
})

test.describe.serial('autenticación de producción con cuenta E2E', () => {
  test.skip(
    !credentials,
    'Definí PLAYWRIGHT_E2E_EMAIL y PLAYWRIGHT_E2E_PASSWORD para ejecutar la capa autenticada de producción.',
  )

  test('login exitoso crea una sesión y navega al inicio', async ({ page, diagnostics }) => {
    await loginWithE2EAccount(page, credentials!)

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: /Ingresar/i })).toHaveCount(0)
    await expectNoVisibleLoaders(page)
    await expectNoUnexpectedRuntimeIssues(page, diagnostics)
  })

  test('la sesión persiste al recargar el perfil', async ({ page, diagnostics }) => {
    await loginWithE2EAccount(page, credentials!)
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByRole('heading', { name: /Mi cuenta/i })).toBeVisible()

    await page.reload()
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByRole('heading', { name: /Mi cuenta/i })).toBeVisible()
    await expectNoVisibleLoaders(page)
    await expectNoUnexpectedRuntimeIssues(page, diagnostics)
  })

  test('las rutas privadas relevantes permanecen accesibles con sesión', async ({
    page,
    diagnostics,
  }) => {
    await loginWithE2EAccount(page, credentials!)

    for (const path of ['/profile', '/favorites', '/requests', '/dashboard']) {
      await page.goto(path)
      await expect(page).toHaveURL(new RegExp(`${path}$`))
      await expect(page).not.toHaveURL(/\/login$/)
    }

    await expectNoVisibleLoaders(page)
    await expectNoUnexpectedRuntimeIssues(page, diagnostics)
  })

  test('logout por UI elimina la sesión y vuelve a proteger el perfil', async ({
    page,
    diagnostics,
  }) => {
    await loginWithE2EAccount(page, credentials!)
    await logoutWithE2EAccount(page)

    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()
    await expectNoVisibleLoaders(page)
    await expectNoUnexpectedRuntimeIssues(page, diagnostics)
  })

  test('login retorna al destino privado exacto guardado por el guard', async ({
    page,
    diagnostics,
  }) => {
    await page.goto('/favorites?foo=bar#test')
    await expect(page).toHaveURL(/\/login$/)

    const historyState = await page.evaluate(() => window.history.state)
    expect(historyState?.usr?.from?.pathname).toBe('/favorites')
    expect(historyState?.usr?.from?.search).toBe('?foo=bar')
    expect(historyState?.usr?.from?.hash).toBe('#test')

    await loginWithE2EAccount(page, credentials!, { navigateToLogin: false })
    await expect(page).toHaveURL(/\/favorites\?foo=bar#test$/)
    await expectNoVisibleLoaders(page)
    await expectNoUnexpectedRuntimeIssues(page, diagnostics)
  })
})

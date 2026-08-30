import { expect, test, type Page } from '@playwright/test'

async function expectSearchPageToSettle(page: Page) {
  const errorHeading = page.getByRole('heading', {
    name: /No se pudieron cargar los resultados/i,
  })
  const emptyState = page.getByText(/No encontramos resultados para/i)
  const resultLinks = page.locator('a[href^="/categorias/"]')

  await expect(page.getByRole('heading', { name: /Resultados de búsqueda/i })).toBeVisible()

  await expect
    .poll(
      async () => {
        if (await errorHeading.isVisible().catch(() => false)) {
          return 'error'
        }

        if (await emptyState.isVisible().catch(() => false)) {
          return 'empty'
        }

        if ((await resultLinks.count()) > 0) {
          return 'results'
        }

        return 'pending'
      },
      {
        timeout: 30_000,
        message: 'La búsqueda debería resolver a resultados o empty state sin romper.',
      },
    )
    .toMatch(/^(results|empty)$/)
}

test('home carga correctamente', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Film Locations Uruguay/i)
  await expect(
    page.getByRole('heading', {
      name: /Encontrá la locación perfecta para tu próximo proyecto/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Film Locations Uruguay/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ingresar/i })).toBeVisible()
})

test('navegación pública principal', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: /^Nosotros$/i }).click()
  await expect(page).toHaveURL(/\/nosotros$/)
  await expect(
    page.getByRole('heading', { name: /Locaciones que cuentan historias/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: /Politica de privacidad/i }).click()
  await expect(page).toHaveURL(/\/privacidad$/)
  await expect(
    page.getByRole('heading', { name: /Política de Privacidad/i }),
  ).toBeVisible()

  await page.getByRole('link', { name: /Terminos y condiciones/i }).click()
  await expect(page).toHaveURL(/\/terminos$/)
  await expect(
    page.getByRole('heading', { name: /Términos y Condiciones/i }),
  ).toBeVisible()
})

test('búsqueda pública acepta un término y resuelve sin romper', async ({ page }) => {
  const searchTerm = 'montevideo'

  await page.goto(`/busqueda?q=${encodeURIComponent(searchTerm)}`)

  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${searchTerm}$`))
  await expectSearchPageToSettle(page)
})

test('/login renderiza y valida el formulario sin credenciales reales', async ({ page }) => {
  await page.goto('/login')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible()
  await expect(page.getByPlaceholder('Ingresá tu contraseña')).toBeVisible()

  await page.getByRole('button', { name: /Iniciar sesión/i }).click()

  await expect(page.getByText('Ingresá tu correo electrónico.')).toBeVisible()
  await expect(page.getByText('Ingresá tu contraseña.')).toBeVisible()
})

test('una ruta protegida redirige al login sin sesión', async ({ page }) => {
  await page.goto('/profile')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()
})

test('el filtro público de búsqueda no rompe URL ni render', async ({ page }) => {
  await page.goto('/busqueda?department=montevideo')

  await expect(page).toHaveURL(/\/busqueda\?department=montevideo$/)
  await expectSearchPageToSettle(page)
})

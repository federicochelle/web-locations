import { expectNoVisibleLoaders, waitForCategoryPageToSettle } from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

test('home carga y soporta reload directo', async ({ page, diagnostics }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Film Locations Uruguay/i)
  await expect(
    page.getByRole('heading', {
      name: /Encontrá la locación perfecta para tu próximo proyecto/i,
    }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Film Locations Uruguay/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /Ingresar/i })).toBeVisible()

  await page.reload()

  await expect(
    page.getByRole('heading', {
      name: /Encontrá la locación perfecta para tu próximo proyecto/i,
    }),
  ).toBeVisible()
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('navegación pública principal y páginas estáticas funcionan con acceso directo y reload', async ({
  page,
  diagnostics,
}) => {
  const routes = [
    {
      path: '/nosotros',
      heading: /Locaciones que cuentan historias/i,
    },
    {
      path: '/privacidad',
      heading: /Política de Privacidad/i,
    },
    {
      path: '/terminos',
      heading: /Términos y Condiciones/i,
    },
  ]

  await page.goto('/')
  await page.getByRole('link', { name: /^Nosotros$/i }).click()
  await expect(page).toHaveURL(/\/nosotros$/)
  await expect(page.getByRole('heading', { name: /Locaciones que cuentan historias/i })).toBeVisible()

  for (const route of routes) {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(`${route.path}$`))
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('heading', { name: route.heading })).toBeVisible()
    await expectNoVisibleLoaders(page)
  }

  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('las categorías de home permiten navegación y reload directo', async ({ page, diagnostics }) => {
  await page.goto('/')

  const categoryLinks = page.locator('a[aria-label^="Explorar categoria "]')
  await expect(categoryLinks.first()).toBeVisible({ timeout: 30_000 })

  const targetHref = await categoryLinks.first().getAttribute('href')
  expect(targetHref, 'La tarjeta de categoría debería tener href.').toBeTruthy()

  await categoryLinks.first().click()
  await waitForCategoryPageToSettle(page)

  await page.reload()
  await waitForCategoryPageToSettle(page)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

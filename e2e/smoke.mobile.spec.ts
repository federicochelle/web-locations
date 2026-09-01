import {
  expectNoVisibleLoaders,
  waitForSearchPageToSettle,
  waitForTurnstileToSettle,
} from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

test('mobile navegación principal permite ir de inicio a login y volver', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/')

  await expect(page.getByRole('navigation', { name: /Navegación principal móvil/i })).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: /Encontrá la locación perfecta para tu próximo proyecto/i,
    }),
  ).toBeVisible()

  await page.getByRole('link', { name: /^Cuenta$/i }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()

  await page.getByLabel(/Ir al inicio de Film Locations Uruguay/i).click()
  await expect(page).toHaveURL(/\/$/)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('mobile búsqueda resuelve y conserva query params con reload', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/busqueda?q=montevideo')

  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(/\/busqueda\?q=montevideo$/)

  await page.reload()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(/\/busqueda\?q=montevideo$/)

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('mobile login renderiza y valida formulario sin credenciales reales', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()
  await expect(page.getByText('Ingresá tu correo electrónico.')).toBeVisible()
  await expect(page.getByText('Ingresá tu contraseña.')).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('mobile postular locación carga y no muestra error inicial de anti-spam', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/postular-locacion')

  await expect(page.getByRole('heading', { name: /Postula tu locación/i })).toBeVisible()
  await waitForTurnstileToSettle(page)
  await expect(page.getByText(/No pudimos cargar la verificacion anti-spam/i)).toHaveCount(0)

  await page.getByRole('button', { name: /Enviar postulacion/i }).click()
  await expect(page.getByText('Ingresa tu nombre.')).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

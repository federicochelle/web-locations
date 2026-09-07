import {
  expectNoVisibleLoaders,
  reportTurnstileSmokeStatus,
  waitForTurnstileToSettle,
} from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

test('postular locación carga completo, expone Turnstile y valida cliente sin submit válido', async ({
  page,
  diagnostics,
}, testInfo) => {
  await page.goto('/postular-locacion')

  await expect(page).toHaveURL(/\/postular-locacion$/)
  await expect(page.getByRole('heading', { name: /Postula tu locación/i })).toBeVisible()
  await expect(page.getByPlaceholder('Tu nombre completo')).toBeVisible()
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible()
  await expect(page.getByPlaceholder('Tu teléfono de contacto')).toBeVisible()
  await expect(page.getByPlaceholder(/Carrasco, Montevideo/i)).toBeVisible()
  await expect(page.getByPlaceholder(/Contanos como es el espacio/i)).toBeVisible()

  const turnstileStatus = await waitForTurnstileToSettle(page, diagnostics)
  reportTurnstileSmokeStatus(testInfo, turnstileStatus)

  await expect(page.getByText(/No pudimos cargar la verificacion anti-spam/i)).toHaveCount(0)

  await page.getByRole('button', { name: /Enviar postulacion/i }).click()

  await expect(page.getByText('Ingresa tu nombre.')).toBeVisible()
  await expect(page.getByText('Ingresa tu email.')).toBeVisible()
  await expect(page.getByText('Ingresa tu teléfono.')).toBeVisible()
  await expect(page.getByText('Ingresa la ubicación de la locación.')).toBeVisible()
  await expect(page.getByText('Agrega una descripción de la locación.')).toBeVisible()

  // Let the test exercise the form's own email validation instead of the browser constraint.
  await page.locator('form').evaluate((form) => {
    form.setAttribute('novalidate', 'true')
  })
  await page.getByPlaceholder('tu@email.com').fill('correo-invalido')
  await page.getByRole('button', { name: /Enviar postulacion/i }).click()
  await expect(page.getByText('Ingresa un email válido.')).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

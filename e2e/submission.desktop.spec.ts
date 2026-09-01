import { expectNoVisibleLoaders, waitForTurnstileToSettle } from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

test('postular locación carga completo, expone Turnstile y valida cliente sin submit válido', async ({
  page,
  diagnostics,
}) => {
  await page.goto('/postular-locacion')

  await expect(page).toHaveURL(/\/postular-locacion$/)
  await expect(page.getByRole('heading', { name: /Postula tu locación/i })).toBeVisible()
  await expect(page.getByPlaceholder('Tu nombre completo')).toBeVisible()
  await expect(page.getByPlaceholder('tu@email.com')).toBeVisible()
  await expect(page.getByPlaceholder('Tu teléfono de contacto')).toBeVisible()
  await expect(page.getByPlaceholder(/Carrasco, Montevideo/i)).toBeVisible()
  await expect(page.getByPlaceholder(/Contanos como es el espacio/i)).toBeVisible()

  await waitForTurnstileToSettle(page)
  await expect(page.getByText(/No pudimos cargar la verificacion anti-spam/i)).toHaveCount(0)

  await page.getByRole('button', { name: /Enviar postulacion/i }).click()

  await expect(page.getByText('Ingresa tu nombre.')).toBeVisible()
  await expect(page.getByText('Ingresa tu email.')).toBeVisible()
  await expect(page.getByText('Ingresa tu teléfono.')).toBeVisible()
  await expect(page.getByText('Ingresa la ubicación de la locación.')).toBeVisible()
  await expect(page.getByText('Agrega una descripción de la locación.')).toBeVisible()

  await page.getByPlaceholder('tu@email.com').fill('correo-invalido')
  await page.getByRole('button', { name: /Enviar postulacion/i }).click()
  await expect(page.getByText('Ingresa un email válido.')).toBeVisible()

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

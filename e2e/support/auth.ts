import type { Page } from '@playwright/test'

import { expect } from './test'

export type E2ECredentials = {
  email: string
  password: string
}

export function getE2ECredentials(): E2ECredentials | null {
  const email = process.env.PLAYWRIGHT_E2E_EMAIL?.trim() || ''
  const password = process.env.PLAYWRIGHT_E2E_PASSWORD?.trim() || ''

  if (!email || !password) {
    return null
  }

  return {
    email,
    password,
  }
}

export async function loginWithE2EAccount(page: Page, credentials: E2ECredentials) {
  await page.goto('/login')

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()

  await page.getByPlaceholder('tu@email.com').fill(credentials.email)
  await page.getByPlaceholder('Ingresá tu contraseña').fill(credentials.password)
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()

  await expect
    .poll(
      async () => new URL(page.url()).pathname,
      {
        timeout: 30_000,
        message: 'El login debería redirigir fuera de /login.',
      },
    )
    .not.toBe('/login')
}

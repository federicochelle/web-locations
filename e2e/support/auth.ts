import type { Page } from '@playwright/test'

import { expect } from './test'

export type E2ECredentials = {
  email: string
  password: string
}

type LoginWithE2EAccountOptions = {
  navigateToLogin?: boolean
}

async function hasPersistedSupabaseSession(page: Page) {
  return await page.evaluate(() =>
    Object.keys(window.localStorage).some(
      (key) =>
        key.startsWith('sb-') &&
        key.endsWith('-auth-token') &&
        Boolean(window.localStorage.getItem(key)),
    ),
  )
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

export async function loginWithE2EAccount(
  page: Page,
  credentials: E2ECredentials,
  { navigateToLogin = true }: LoginWithE2EAccountOptions = {},
) {
  if (navigateToLogin) {
    await page.goto('/login')
  }

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible()

  await page.getByPlaceholder('tu@email.com').fill(credentials.email)
  await page.getByPlaceholder('Ingresá tu contraseña').fill(credentials.password)
  await page.getByRole('button', { name: /Iniciar sesión/i }).click()

  await expect
    .poll(
      async () => {
        if (
          await page
            .getByRole('heading', { name: /No pudimos iniciar sesión|Confirmá tu correo/i })
            .isVisible()
            .catch(() => false)
        ) {
          return 'authentication-error'
        }

        return new URL(page.url()).pathname === '/login' ? 'pending' : 'authenticated'
      },
      {
        timeout: 30_000,
        message: 'El login E2E debería completar la autenticación sin exponer credenciales.',
      },
    )
    .toBe('authenticated')
}

export async function logoutWithE2EAccount(page: Page) {
  const menuTrigger = page.locator('header').getByRole('button').first()
  const logoutStatuses: number[] = []
  const trackLogoutResponse = (response: { url(): string; status(): number }) => {
    if (/\/auth\/v1\/logout(?:\?|$)/.test(response.url())) {
      logoutStatuses.push(response.status())
    }
  }

  page.on('response', trackLogoutResponse)

  try {
    await expect(menuTrigger).toBeVisible()
    await menuTrigger.click()
    await page.getByRole('menuitem', { name: /Cerrar sesion/i }).click()

    await expect
      .poll(
        () => new URL(page.url()).pathname,
        {
          timeout: 30_000,
          message: 'El logout E2E debería volver al inicio.',
        },
      )
      .toBe('/')

    await expect
      .poll(
        () => hasPersistedSupabaseSession(page),
        {
          timeout: 30_000,
          message: `El logout E2E debería eliminar la sesión local de Supabase. HTTP logout: ${logoutStatuses.join(', ') || 'sin respuesta observada'}.`,
        },
      )
      .toBe(false)

    await expect(
      page.locator('header').getByRole('link', { name: /Ingresar/i }),
    ).toBeVisible({ timeout: 30_000 })
  } finally {
    page.off('response', trackLogoutResponse)
  }
}

import type { Page } from '@playwright/test'

import { expect } from './test'

export async function waitForSearchPageToSettle(page: Page) {
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

export async function getSearchOutcome(page: Page) {
  const emptyState = page.getByText(/No encontramos resultados para/i)
  const resultLinks = page.locator('a[href^="/categorias/"]')

  if (await emptyState.isVisible().catch(() => false)) {
    return 'empty' as const
  }

  if ((await resultLinks.count()) > 0) {
    return 'results' as const
  }

  throw new Error('La página de búsqueda no terminó en resultados ni empty state.')
}

export async function waitForCategoryPageToSettle(page: Page) {
  const errorHeading = page.getByRole('heading', {
    name: /No se pudieron cargar las locaciones/i,
  })
  const emptyState = page.getByRole('heading', {
    name: /No encontramos resultados|Categoria no encontrada/i,
  })
  const resultLinks = page.locator('a[href^="/categorias/"]')

  await expect(page).toHaveURL(/\/categorias\//)

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
        message: 'La categoría debería resolver sin quedarse cargando.',
      },
    )
    .toMatch(/^(results|empty)$/)
}

export async function waitForTurnstileToSettle(page: Page) {
  const antiSpamError = page.getByText(/No pudimos cargar la verificacion anti-spam/i)
  const widgetFrame = page.locator('iframe[src*="challenges.cloudflare.com"]').first()

  await expect
    .poll(
      async () => {
        if (await antiSpamError.isVisible().catch(() => false)) {
          return 'error'
        }

        if (await widgetFrame.isVisible().catch(() => false)) {
          return 'widget'
        }

        return 'pending'
      },
      {
        timeout: 20_000,
        message: 'Turnstile debería cargar o exponer un error claro.',
      },
    )
    .toBe('widget')
}

export async function expectNoVisibleLoaders(page: Page) {
  const loadingTexts = [
    /Cargando.../i,
    /Cargando categorías.../i,
    /Cargando locaciones.../i,
    /Cargando resultados.../i,
    /Cargando tu sesión.../i,
    /Interpretando búsqueda.../i,
  ]

  await expect
    .poll(
      async () => {
        for (const pattern of loadingTexts) {
          if (await page.getByText(pattern).first().isVisible().catch(() => false)) {
            return false
          }
        }

        return true
      },
      {
        timeout: 20_000,
        message: 'No debería quedar un loader visible de forma infinita.',
      },
    )
    .toBe(true)
}

import type { Page, TestInfo } from '@playwright/test'

import { expect, type RuntimeDiagnostics } from './test'

export type TurnstileSmokeStatus =
  | {
      kind: 'TURNSTILE_OK'
    }
  | {
      kind: 'TURNSTILE_EXTERNAL_FAILURE'
      details: string[]
    }

export function reportTurnstileSmokeStatus(testInfo: TestInfo, status: TurnstileSmokeStatus) {
  const description =
    status.kind === 'TURNSTILE_OK'
      ? 'TURNSTILE_OK'
      : `TURNSTILE_EXTERNAL_FAILURE: ${status.details.join(' | ')}`

  testInfo.annotations.push({
    type: 'turnstile',
    description,
  })
  console.log(`[turnstile-smoke] ${description}`)
}

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

export async function waitForTurnstileToSettle(
  page: Page,
  diagnostics: RuntimeDiagnostics,
): Promise<TurnstileSmokeStatus> {
  const script = page.locator('#cloudflare-turnstile-script')
  const applicationLoadError = page.getByText(/No pudimos cargar la verificacion anti-spam/i)
  const applicationValidationError = page.getByText(/No pudimos validar la verificacion anti-spam/i)
  const widgetFrame = page.locator('iframe[src*="challenges.cloudflare.com"]').first()

  // The script is created by our component only when a site key is configured.
  await expect(script).toHaveCount(1, { timeout: 5_000 })

  let state = 'pending'

  await expect
    .poll(
      async () => {
        if (await widgetFrame.isVisible().catch(() => false)) {
          state = 'widget'
          return state
        }

        if (diagnostics.externalIssues.length > 0) {
          state = 'external-failure'
          return state
        }

        if (
          await applicationLoadError.isVisible().catch(() => false) ||
          await applicationValidationError.isVisible().catch(() => false)
        ) {
          state = 'application-error'
          return state
        }

        state = 'pending'
        return 'pending'
      },
      {
        timeout: 10_000,
        message: 'Turnstile debería renderizarse o Cloudflare debería exponer un fallo externo.',
      },
    )
    .toMatch(/^(widget|external-failure)$/)

  if (state === 'widget') {
    return { kind: 'TURNSTILE_OK' }
  }

  return {
    kind: 'TURNSTILE_EXTERNAL_FAILURE',
    details: diagnostics.externalIssues.map((issue) => `${issue.kind}: ${issue.detail} ${issue.url}`),
  }
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

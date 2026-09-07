import type { Page } from '@playwright/test'

import {
  expect,
} from './test'
import {
  expectNoVisibleLoaders,
  waitForCategoryPageToSettle,
  waitForSearchPageToSettle,
} from './app'

type ProjectLocationMutation = {
  method: string
  url: string
}

const PROJECT_LOCATION_MUTATION_PATTERN =
  /request_project_locations|request_project_location_images/i
const E2E_PROJECT_TITLE_PREFIX = 'E2E-PW-'
const SELECTION_DRAWER_NAME = /Editor de propuesta/i
const SELECTION_DRAWER_TRIGGER_NAME = /Abrir selección de imágenes/i
const SELECTION_DRAWER_CLOSE_NAME = /Cerrar drawer de seleccion/i

function getSelectionDrawer(page: Page) {
  return page.getByRole('dialog', { name: SELECTION_DRAWER_NAME })
}

function getSelectionDrawerTrigger(page: Page) {
  return page.getByRole('button', { name: SELECTION_DRAWER_TRIGGER_NAME })
}

export function trackProjectLocationMutations(page: Page) {
  const mutations: ProjectLocationMutation[] = []

  const handleRequest = (request: { method: () => string; url: () => string }) => {
    const method = request.method()
    const url = request.url()

    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return
    }

    if (!PROJECT_LOCATION_MUTATION_PATTERN.test(url)) {
      return
    }

    mutations.push({
      method,
      url,
    })
  }

  page.on('request', handleRequest)

  return {
    mutations,
    dispose: () => {
      page.off('request', handleRequest)
    },
  }
}

export function expectNoProjectLocationMutations(
  mutations: ProjectLocationMutation[],
  message: string,
) {
  expect(
    mutations,
    `${message}\n${mutations.map((issue) => `${issue.method} ${issue.url}`).join('\n')}`,
  ).toEqual([])
}

export async function waitForDrawerOpen(page: Page) {
  await expect(getSelectionDrawerTrigger(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(getSelectionDrawer(page)).toBeVisible()
}

export async function waitForDrawerClosed(page: Page) {
  await expect(getSelectionDrawerTrigger(page)).toHaveAttribute('aria-expanded', 'false')
  await expect(getSelectionDrawer(page)).toHaveCount(0)
}

export async function closeDrawer(page: Page) {
  await page.getByRole('button', { name: SELECTION_DRAWER_CLOSE_NAME }).click()
  await waitForDrawerClosed(page)
}

export async function openDrawer(page: Page) {
  await getSelectionDrawerTrigger(page).click()
  await waitForDrawerOpen(page)
}

export async function ensureDrawerOpen(page: Page) {
  const drawer = getSelectionDrawer(page)

  if (await drawer.isVisible().catch(() => false)) {
    return
  }

  await openDrawer(page)
}

export async function openRequestsPage(page: Page) {
  await page.goto('/requests')
  await expect(page).toHaveURL(/\/requests$/)
  await expect(page.getByRole('heading', { name: /Mis proyectos/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Borradores \(\d+\)/i })).toBeVisible()
}

export async function cleanupDraftProjectsByTitles(page: Page, titles: string[]) {
  if (page.isClosed()) {
    return 'page-closed' as const
  }

  try {
    if (titles.length === 0) {
      return 'completed' as const
    }

    await openRequestsPage(page)

    const uniqueTitles = [...new Set(titles)]

    for (const title of uniqueTitles) {
      if (!title.startsWith(E2E_PROJECT_TITLE_PREFIX)) {
        throw new Error(`El cleanup E2E rechazó un título fuera de alcance: ${title}`)
      }
    }

    await page.getByRole('button', { name: /Borradores \(/i }).click()

    for (const title of uniqueTitles) {
      const deleteButton = page.getByRole('button', {
        name: new RegExp(`^Eliminar borrador ${escapeRegExp(title)}$`, 'i'),
      })

      const isVisible = await deleteButton.isVisible().catch(() => false)

      if (!isVisible) {
        continue
      }

      await deleteButton.click({ force: true })
      await expect(page.getByRole('heading', { name: /Eliminar borrador/i })).toBeVisible()
      await page.getByRole('button', { name: /^Eliminar$/i }).click()
      await expect(page.getByRole('status')).toContainText(/Borrador eliminado correctamente/i)
      await expect(deleteButton).toHaveCount(0)
    }

    return 'completed' as const
  } catch (error) {
    if (page.isClosed()) {
      return 'page-closed' as const
    }

    throw error
  }
}

export async function collectSearchDetailPaths(page: Page, count: number) {
  const searchRoutes = [
    '/busqueda?q=montevideo',
    '/busqueda?q=carrasco',
    '/busqueda',
  ]

  for (const route of searchRoutes) {
    await page.goto(route)
    await waitForSearchPageToSettle(page)

    const hrefs = await collectVisibleDetailPaths(page)

    if (hrefs.length > 0) {
      return hrefs.slice(0, count)
    }
  }

  await page.goto('/')
  await expect(page.getByRole('heading', {
    name: /Encontrá la locación perfecta para tu próximo proyecto/i,
  })).toBeVisible()

  const firstCategoryLink = page.locator('a[aria-label^="Explorar categoria "]').first()
  const categoryHref = await firstCategoryLink.getAttribute('href')

  if (!categoryHref) {
    return []
  }

  await firstCategoryLink.click()
  await waitForCategoryPageToSettle(page)

  return (await collectVisibleDetailPaths(page)).slice(0, count)
}

async function collectVisibleDetailPaths(page: Page) {
  return page.locator('a[href^="/categorias/"]').evaluateAll((links) => {
    const detailPathPattern = /^\/categorias\/[^/]+\/[^/]+$/u
    const nextPaths: string[] = []

    for (const link of links) {
      const href = link.getAttribute('href')

      if (!href || !detailPathPattern.test(href) || nextPaths.includes(href)) {
        continue
      }

      nextPaths.push(href)
    }

    return nextPaths
  })
}

export async function openLocationDetail(page: Page, detailPath: string) {
  await page.goto(detailPath)
  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(detailPath)}$`))
  await expect(page.locator('h1').first()).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Seleccionar imagen \d+/i }).first(),
  ).toBeVisible({ timeout: 30_000 })
  await expectNoVisibleLoaders(page)
}

export async function selectFirstImage(page: Page) {
  await page.getByRole('button', { name: /Seleccionar imagen \d+/i }).first().click()
}

export async function getCurrentLocationCode(page: Page) {
  return (await page.locator('h1').first().textContent())?.trim() || 'Locacion'
}

export async function expectSelectedLocationVisible(page: Page, locationCode: string) {
  await expect(
    page.getByRole('button', {
      name: new RegExp(`^Quitar locacion ${escapeRegExp(locationCode)} de la seleccion$`, 'i'),
    }),
  ).toBeVisible()
}

export async function removeSelectedLocation(page: Page, locationCode: string) {
  await page
    .getByRole('button', {
      name: new RegExp(`^Quitar locacion ${escapeRegExp(locationCode)} de la seleccion$`, 'i'),
    })
    .click({ force: true })
}

export async function expectProjectSelected(page: Page, projectTitle: string) {
  const checkedOption = page.locator('select[aria-label="Proyecto activo"] option:checked')
  await expect(checkedOption).toContainText(projectTitle)
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

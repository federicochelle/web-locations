import { expectNoVisibleLoaders } from './support/app'
import { getE2ECredentials, loginWithE2EAccount } from './support/auth'
import {
  cleanupDraftProjectsByTitles,
  closeDrawer,
  collectSearchDetailPaths,
  expectNoProjectLocationMutations,
  expectProjectSelected,
  expectSelectedLocationVisible,
  getCurrentLocationCode,
  openDrawer,
  openLocationDetail,
  openRequestsPage,
  removeSelectedLocation,
  selectFirstImage,
  trackProjectLocationMutations,
  waitForDrawerOpen,
} from './support/projects'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

const credentials = getE2ECredentials()
const E2E_PROJECT_TITLE_PREFIX = 'E2E-PW-'
const READ_ONLY_PROJECT_TITLE_PREFIX = 'E2E-PW-READONLY'
const CLEANUP_TIMEOUT_MS = 15_000

function createProjectTitle(testName: string, suffix: string) {
  return `${E2E_PROJECT_TITLE_PREFIX}${testName}-${Date.now()}-${suffix}`
}

async function createDraftWithSelectedLocation(
  page: Parameters<typeof openDrawer>[0],
  title: string,
  detailPath: string,
) {
  await test.step('CREATE_DRAFT: preparar proyecto nuevo', async () => {
    await openRequestsPage(page)
    await openDrawer(page)

    const activeProjectSelect = page.getByLabel('Proyecto activo')
    if (await activeProjectSelect.isVisible().catch(() => false)) {
      await activeProjectSelect.selectOption({ label: 'Nuevo proyecto' })
    }

    await expect(page.getByRole('heading', { name: /Creá tu proyecto/i })).toBeVisible()
    await closeDrawer(page)
  })

  const locationCode = await test.step('ADD_LOCATION', async () => {
    await openLocationDetail(page, detailPath)
    const nextLocationCode = await getCurrentLocationCode(page)
    await selectFirstImage(page)
    await waitForDrawerOpen(page)
    await expect(page.getByRole('heading', { name: /Creá tu proyecto/i })).toBeVisible()
    return nextLocationCode
  })

  await test.step('CREATE_DRAFT: confirmar', async () => {
    await page.getByLabel('Producto').fill(title)
    await page.getByRole('button', { name: /^Confirmar$/i }).click()
    await expectProjectSelected(page, title)
  })

  await test.step('VERIFY_SELECTED', async () => {
    await expectSelectedLocationVisible(page, locationCode)
  })

  return locationCode
}

async function getDetailPathsOrSkip(page: Parameters<typeof openDrawer>[0], count: number) {
  const detailPaths = await collectSearchDetailPaths(page, count)
  test.skip(
    detailPaths.length < count,
    `No encontré ${count} locación(es) publicada(s) apta(s) para el flujo E2E.`,
  )
  return detailPaths
}

test.describe.serial('drawer de proyectos autenticado', () => {
  test.skip(
    !credentials,
    'Definí PLAYWRIGHT_E2E_EMAIL y PLAYWRIGHT_E2E_PASSWORD para correr la capa funcional de proyectos.',
  )

  test('A: un draft conserva la locación al cerrar y reabrir el drawer', async ({ page, diagnostics }, testInfo) => {
    const title = createProjectTitle('drawer', 'close-reopen')
    let functionalError: unknown

    try {
      await test.step('LOGIN', async () => {
        await loginWithE2EAccount(page, credentials!)
      })
      const [detailPath] = await test.step('ADD_LOCATION: localizar fixture publicado', async () =>
        await getDetailPathsOrSkip(page, 1),
      )
      const locationCode = await createDraftWithSelectedLocation(page, title, detailPath!)

      await test.step('CLOSE_DRAWER', async () => {
        await closeDrawer(page)
      })
      await test.step('REOPEN_DRAWER', async () => {
        await openDrawer(page)
      })
      await test.step('VERIFY_PERSISTED', async () => {
        await expectProjectSelected(page, title)
        await expectSelectedLocationVisible(page, locationCode)
      })
      await expectNoUnexpectedRuntimeIssues(page, diagnostics)
    } catch (error) {
      functionalError = error
      throw error
    } finally {
      // The functional flow keeps its normal 30 s budget; cleanup gets a bounded extension.
      testInfo.setTimeout(testInfo.timeout + CLEANUP_TIMEOUT_MS)

      try {
        const cleanupResult = await test.step('CLEANUP', async () =>
          await cleanupDraftProjectsByTitles(page, [title]),
        )

        if (cleanupResult === 'page-closed') {
          testInfo.annotations.push({
            type: 'cleanup',
            description: 'CLEANUP_SKIPPED_PAGE_CLOSED: se preservó el fallo original.',
          })
        }
      } catch (cleanupError) {
        if (functionalError) {
          testInfo.annotations.push({
            type: 'cleanup',
            description: `CLEANUP_FAILED_PRESERVED_FUNCTIONAL_FAILURE: ${String(cleanupError)}`,
          })
        } else {
          throw cleanupError
        }
      }
    }
  })

  test('B: un draft conserva la selección después de reload completo', async ({ page, diagnostics }) => {
    const title = createProjectTitle('drawer', 'reload')

    try {
      await loginWithE2EAccount(page, credentials!)
      const [detailPath] = await getDetailPathsOrSkip(page, 1)
      const locationCode = await createDraftWithSelectedLocation(page, title, detailPath!)

      await closeDrawer(page)
      await page.reload()
      await expectNoVisibleLoaders(page)
      await openDrawer(page)
      await expectProjectSelected(page, title)
      await expectSelectedLocationVisible(page, locationCode)
      await expectNoUnexpectedRuntimeIssues(page, diagnostics)
    } finally {
      await cleanupDraftProjectsByTitles(page, [title])
    }
  })

  test('C: cada proyecto conserva su propia selección al alternar el proyecto activo', async ({ page, diagnostics }) => {
    const firstTitle = createProjectTitle('drawer', 'switch-a')
    const secondTitle = createProjectTitle('drawer', 'switch-b')

    try {
      await loginWithE2EAccount(page, credentials!)
      const [firstDetailPath, secondDetailPath] = await getDetailPathsOrSkip(page, 2)
      const firstLocationCode = await createDraftWithSelectedLocation(page, firstTitle, firstDetailPath!)

      await page.getByLabel('Proyecto activo').selectOption({ label: 'Nuevo proyecto' })
      await closeDrawer(page)
      await openLocationDetail(page, secondDetailPath!)
      const secondLocationCode = await getCurrentLocationCode(page)
      await selectFirstImage(page)
      await waitForDrawerOpen(page)
      await page.getByLabel('Producto').fill(secondTitle)
      await page.getByRole('button', { name: /^Confirmar$/i }).click()
      await expectProjectSelected(page, secondTitle)
      await expectSelectedLocationVisible(page, secondLocationCode)

      await page.getByLabel('Proyecto activo').selectOption({ label: firstTitle })
      await expectProjectSelected(page, firstTitle)
      await expectSelectedLocationVisible(page, firstLocationCode)

      await page.getByLabel('Proyecto activo').selectOption({ label: secondTitle })
      await expectProjectSelected(page, secondTitle)
      await expectSelectedLocationVisible(page, secondLocationCode)
      await expectNoUnexpectedRuntimeIssues(page, diagnostics)
    } finally {
      await cleanupDraftProjectsByTitles(page, [firstTitle, secondTitle])
    }
  })

  test('D: quitar la última locación de un draft persiste después de reload', async ({ page, diagnostics }) => {
    const title = createProjectTitle('drawer', 'remove')

    try {
      await loginWithE2EAccount(page, credentials!)
      const [detailPath] = await getDetailPathsOrSkip(page, 1)
      const locationCode = await createDraftWithSelectedLocation(page, title, detailPath!)

      page.once('dialog', (dialog) => dialog.accept())
      await removeSelectedLocation(page, locationCode)
      await expect(
        page.getByRole('button', {
          name: new RegExp(`^Quitar locacion ${escapeRegExp(locationCode)} de la seleccion$`, 'i'),
        }),
      ).toHaveCount(0)

      await closeDrawer(page)
      await page.reload()
      await expectNoVisibleLoaders(page)
      await openDrawer(page)
      await expectProjectSelected(page, title)
      await expect(page.getByRole('heading', { name: /Todavía no agregaste locaciones/i })).toBeVisible()
      await expectNoUnexpectedRuntimeIssues(page, diagnostics)
    } finally {
      await cleanupDraftProjectsByTitles(page, [title])
    }
  })

  test('E: un proyecto confirmed controlado permanece en modo lectura sin mutar locaciones', async ({ page, diagnostics }) => {
    await loginWithE2EAccount(page, credentials!)
    await openRequestsPage(page)
    await page.getByRole('button', { name: /Enviados \(/i }).click()

    const readOnlyProject = page.getByRole('link', {
      name: new RegExp(`^${escapeRegExp(READ_ONLY_PROJECT_TITLE_PREFIX)}`, 'i'),
    })
    test.skip(
      (await readOnlyProject.count()) === 0,
      `No existe un fixture confirmed controlado con prefijo ${READ_ONLY_PROJECT_TITLE_PREFIX}.`,
    )

    const mutations = trackProjectLocationMutations(page)

    try {
      await readOnlyProject.first().click()
      await expect(page).toHaveURL(/\/requests\/.+/)
      await expect(page.getByText(/^Confirmado$/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /Editar proyecto/i })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Agregar locaciones/i })).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Quitar imagen seleccionada/i })).toHaveCount(0)

      await page.reload()
      await expectNoVisibleLoaders(page)
      expectNoProjectLocationMutations(
        mutations.mutations,
        'Un proyecto confirmed en modo lectura no debe mutar request_project_locations.',
      )
      await expectNoUnexpectedRuntimeIssues(page, diagnostics)
    } finally {
      mutations.dispose()
    }
  })
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

import { expectNoVisibleLoaders } from './support/app'
import { getE2ECredentials, loginWithE2EAccount } from './support/auth'
import {
  cleanupDraftProjectsByTitles,
  closeDrawer,
  collectSearchDetailPaths,
  ensureDrawerOpen,
  expectNoProjectLocationMutations,
  expectProjectSelected,
  expectSelectedLocationVisible,
  openDrawer,
  openLocationDetail,
  openRequestsPage,
  removeSelectedLocation,
  selectFirstImage,
  trackProjectLocationMutations,
  waitForDrawerOpen,
  getCurrentLocationCode,
} from './support/projects'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

const credentials = getE2ECredentials()

test.describe.serial('drawer de proyectos autenticado', () => {
  test.skip(
    !credentials,
    'Definí PLAYWRIGHT_E2E_EMAIL y PLAYWRIGHT_E2E_PASSWORD para correr la capa autenticada del drawer.',
  )

  test('persiste borradores y selección al cerrar, reabrir, recargar, navegar y cambiar de proyecto', async ({
    page,
    diagnostics,
  }, testInfo) => {
    const createdProjectTitles: string[] = []
    const runPrefix = `E2E Drawer ${testInfo.project.name} ${Date.now()}`
    const projectOneTitle = `${runPrefix} A`
    const projectTwoTitle = `${runPrefix} B`

    try {
      await loginWithE2EAccount(page, credentials!)
      await openRequestsPage(page)
      await cleanupDraftProjectsByTitles(page, [projectOneTitle, projectTwoTitle])
      await openDrawer(page)

      const activeProjectSelect = page.getByLabel('Proyecto activo')
      if (await activeProjectSelect.isVisible().catch(() => false)) {
        await activeProjectSelect.selectOption({ label: 'Nuevo proyecto' })
      }

      await expect(page.getByRole('heading', { name: /Creá tu proyecto/i })).toBeVisible()
      await closeDrawer(page)

      const detailPaths = await collectSearchDetailPaths(page, 2)
      test.skip(
        detailPaths.length < 1,
        'No encontré locaciones públicas usables para cubrir la persistencia del drawer.',
      )

      await openLocationDetail(page, detailPaths[0]!)
      const firstLocationCode = await getCurrentLocationCode(page)
      await selectFirstImage(page)
      await waitForDrawerOpen(page)

      await expect(page.getByRole('heading', { name: /Creá tu proyecto/i })).toBeVisible()
      await page.getByLabel('Producto').fill(projectOneTitle)
      await page.getByRole('button', { name: /^Confirmar$/i }).click()
      createdProjectTitles.push(projectOneTitle)

      await expectProjectSelected(page, projectOneTitle)
      await expectSelectedLocationVisible(page, firstLocationCode)

      await closeDrawer(page)
      await openDrawer(page)
      await expectProjectSelected(page, projectOneTitle)
      await expectSelectedLocationVisible(page, firstLocationCode)
      await closeDrawer(page)

      const secondDetailPath = detailPaths[1] ?? null
      let persistedLocationCodeForProjectTwo = firstLocationCode

      if (secondDetailPath) {
        await openLocationDetail(page, secondDetailPath)
        const secondLocationCode = await getCurrentLocationCode(page)
        await selectFirstImage(page)
        await openDrawer(page)
        await expectProjectSelected(page, projectOneTitle)
        await expectSelectedLocationVisible(page, firstLocationCode)
        await expectSelectedLocationVisible(page, secondLocationCode)

        await removeSelectedLocation(page, firstLocationCode)
        await expect(
          page.getByRole('link', {
            name: new RegExp(`^Ver locacion ${escapeRegExp(firstLocationCode)}$`, 'i'),
          }),
        ).toHaveCount(0)
        await expectSelectedLocationVisible(page, secondLocationCode)

        await closeDrawer(page)
        await openDrawer(page)
        await expectProjectSelected(page, projectOneTitle)
        await expectSelectedLocationVisible(page, secondLocationCode)
        persistedLocationCodeForProjectTwo = secondLocationCode
      }

      await page.getByLabel('Proyecto activo').selectOption({ label: 'Nuevo proyecto' })
      await expect(page.getByRole('heading', { name: /Creá tu proyecto/i })).toBeVisible()
      await closeDrawer(page)

      await openLocationDetail(page, secondDetailPath ?? detailPaths[0]!)
      await selectFirstImage(page)
      await waitForDrawerOpen(page)
      await page.getByLabel('Producto').fill(projectTwoTitle)
      await page.getByRole('button', { name: /^Confirmar$/i }).click()
      createdProjectTitles.push(projectTwoTitle)

      await expectProjectSelected(page, projectTwoTitle)
      await expectSelectedLocationVisible(page, persistedLocationCodeForProjectTwo)

      await closeDrawer(page)
      await openRequestsPage(page)
      await openDrawer(page)
      await expectProjectSelected(page, projectTwoTitle)
      await expectSelectedLocationVisible(page, persistedLocationCodeForProjectTwo)

      await page.reload()
      await expectNoVisibleLoaders(page)
      await openDrawer(page)
      await expectProjectSelected(page, projectTwoTitle)
      await expectSelectedLocationVisible(page, persistedLocationCodeForProjectTwo)
      await closeDrawer(page)

      await page.goto('/nosotros')
      await expect(page.getByRole('heading', { name: /Locaciones que cuentan historias/i })).toBeVisible()
      await page.goBack()
      await expect(page).toHaveURL(/\/requests$/)
      await expectNoVisibleLoaders(page)
      await page.goForward()
      await expect(page).toHaveURL(/\/nosotros$/)
      await expectNoVisibleLoaders(page)

      await ensureDrawerOpen(page)
      await expectProjectSelected(page, projectTwoTitle)
      await expectSelectedLocationVisible(page, persistedLocationCodeForProjectTwo)
      await page.goBack()
      await expect(page).toHaveURL(/\/requests$/)
      await expectNoVisibleLoaders(page)
      await page.goForward()
      await expect(page).toHaveURL(/\/nosotros$/)
      await expectNoVisibleLoaders(page)
      await ensureDrawerOpen(page)
      await expectProjectSelected(page, projectTwoTitle)
      await expectSelectedLocationVisible(page, persistedLocationCodeForProjectTwo)

      await expectNoUnexpectedRuntimeIssues(page, diagnostics)
    } finally {
      if (createdProjectTitles.length > 0) {
        await cleanupDraftProjectsByTitles(page, createdProjectTitles)
      }
    }
  })

  test('proyectos enviados respetan lectura o edición sin mutar request_project_locations fuera de draft', async ({
    page,
    diagnostics,
  }) => {
    await loginWithE2EAccount(page, credentials!)
    await openRequestsPage(page)
    await page.getByRole('button', { name: /Enviados \(/i }).click()

    const emptySubmittedState = page.getByText(/Todavía no enviaste ningún proyecto/i)
    if (await emptySubmittedState.isVisible().catch(() => false)) {
      test.skip(true, 'La cuenta de testing no tiene proyectos enviados para validar este flujo.')
    }

    const mutations = trackProjectLocationMutations(page)
    const firstSentProjectLink = page.locator('a[href^="/requests/"]').first()
    await expect(firstSentProjectLink).toBeVisible()
    await firstSentProjectLink.click()

    try {
      await expect(page).toHaveURL(/\/requests\/.+/)
      await expectNoVisibleLoaders(page)

      const isConfirmed = await page.getByText(/^Confirmado$/i).isVisible().catch(() => false)

      if (isConfirmed) {
        await expect(page.getByRole('button', { name: /Editar proyecto/i })).toHaveCount(0)
        await expect(page.getByRole('button', { name: /Agregar locaciones/i })).toHaveCount(0)
        await expect(page.getByRole('button', { name: /Quitar imagen seleccionada/i })).toHaveCount(0)
      } else {
        const editButton = page.getByRole('button', { name: /Editar proyecto/i })
        await expect(editButton).toBeVisible()
        await editButton.click()
        await expect(page.getByRole('button', { name: /Cancelar edición/i })).toBeVisible()
      }

      await page.reload()
      await expectNoVisibleLoaders(page)
      expectNoProjectLocationMutations(
        mutations.mutations,
        'No debería mutarse request_project_locations al abrir o revisar un proyecto no draft.',
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

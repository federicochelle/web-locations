import {
  expectNoVisibleLoaders,
  getSearchOutcome,
  waitForSearchPageToSettle,
} from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

const VALID_SEARCH_TERM = 'montevideo'
const SECOND_SEARCH_TERM = 'carrasco'
const EMPTY_SEARCH_TERM = 'playwright-no-result-zzzz-uy'
const DEPARTMENT_SLUG = 'montevideo'

test('búsqueda válida resuelve, conserva query params y soporta back/forward/reload', async ({
  page,
  diagnostics,
}) => {
  await page.goto(`/busqueda?q=${encodeURIComponent(VALID_SEARCH_TERM)}`)
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${VALID_SEARCH_TERM}$`))

  await page.goto(`/busqueda?q=${encodeURIComponent(SECOND_SEARCH_TERM)}`)
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${SECOND_SEARCH_TERM}$`))

  await page.goBack()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${VALID_SEARCH_TERM}$`))

  await page.goForward()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${SECOND_SEARCH_TERM}$`))

  await page.reload()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${SECOND_SEARCH_TERM}$`))
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('búsqueda sin resultados muestra empty state sin romper', async ({ page, diagnostics }) => {
  await page.goto(`/busqueda?q=${encodeURIComponent(EMPTY_SEARCH_TERM)}`)
  await waitForSearchPageToSettle(page)

  await expect(page.getByText(new RegExp(`No encontramos resultados para "${EMPTY_SEARCH_TERM}"`, 'i'))).toBeVisible()
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('filtros por departamento y combinación búsqueda + departamento no rompen URL ni render', async ({
  page,
  diagnostics,
}) => {
  await page.goto(`/busqueda?department=${DEPARTMENT_SLUG}`)
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?department=${DEPARTMENT_SLUG}$`))

  await page.goto(
    `/busqueda?q=${encodeURIComponent(VALID_SEARCH_TERM)}&department=${DEPARTMENT_SLUG}`,
  )
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(
    new RegExp(`/busqueda\\?q=${VALID_SEARCH_TERM}&department=${DEPARTMENT_SLUG}$`),
  )

  await page.reload()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(
    new RegExp(`/busqueda\\?q=${VALID_SEARCH_TERM}&department=${DEPARTMENT_SLUG}$`),
  )

  await page.goto('/busqueda')
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(/\/busqueda$/)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('búsquedas consecutivas rápidas conservan el último término y no dejan estado roto', async ({
  page,
  diagnostics,
}) => {
  const terms = [
    VALID_SEARCH_TERM,
    SECOND_SEARCH_TERM,
    EMPTY_SEARCH_TERM,
  ]

  for (const term of terms) {
    await page.goto(`/busqueda?q=${encodeURIComponent(term)}`, {
      waitUntil: 'domcontentloaded',
    })
  }

  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(new RegExp(`/busqueda\\?q=${EMPTY_SEARCH_TERM}$`))

  const outcome = await getSearchOutcome(page)
  expect(['results', 'empty']).toContain(outcome)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

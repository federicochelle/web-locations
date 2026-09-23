import {
  expectNoVisibleLoaders,
  getSearchOutcome,
  waitForCategoryPageToSettle,
  waitForSearchPageToSettle,
} from './support/app'
import { expect, expectNoUnexpectedRuntimeIssues, test } from './support/test'

const VALID_SEARCH_TERM = 'montevideo'
const DEPARTMENT_SLUG = 'montevideo'
const CATEGORY_SLUG = 'casas'
const FEATURE_SLUG = 'jardin'

test('URL antigua con q se limpia y no dispara búsqueda semántica', async ({
  page,
  diagnostics,
}) => {
  const semanticRequests: string[] = []
  const textSearchRpcRequests: string[] = []

  page.on('request', (request) => {
    const url = request.url()

    if (url.includes('/functions/v1/search-query-analysis')) {
      semanticRequests.push(url)
    }

    if (
      url.includes('/rpc/search_public_locations_v4') ||
      url.includes('/rpc/search_public_locations_v4_related') ||
      url.includes('/rpc/search_public_locations_v3')
    ) {
      textSearchRpcRequests.push(url)
    }
  })

  await page.goto(`/busqueda?q=${encodeURIComponent(VALID_SEARCH_TERM)}`)
  await waitForSearchPageToSettle(page)

  await expect(page).toHaveURL(/\/busqueda$/)
  expect(semanticRequests).toEqual([])
  expect(textSearchRpcRequests).toEqual([])

  await page.reload()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(/\/busqueda$/)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('filtros no textuales en búsqueda conservan URL y render', async ({ page, diagnostics }) => {
  await page.goto(
    `/busqueda?department=${DEPARTMENT_SLUG}&category=${CATEGORY_SLUG}&features=${FEATURE_SLUG}`,
  )
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(
    new RegExp(`/busqueda\\?department=${DEPARTMENT_SLUG}&category=${CATEGORY_SLUG}&features=${FEATURE_SLUG}$`),
  )

  await page.reload()
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(
    new RegExp(`/busqueda\\?department=${DEPARTMENT_SLUG}&category=${CATEGORY_SLUG}&features=${FEATURE_SLUG}$`),
  )

  await page.goto('/busqueda')
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(/\/busqueda$/)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('q combinado con filtros no textuales se elimina sin perder filtros', async ({
  page,
  diagnostics,
}) => {
  await page.goto(
    `/busqueda?q=${encodeURIComponent(VALID_SEARCH_TERM)}&department=${DEPARTMENT_SLUG}&features=${FEATURE_SLUG}`,
  )
  await waitForSearchPageToSettle(page)
  await expect(page).toHaveURL(
    new RegExp(`/busqueda\\?department=${DEPARTMENT_SLUG}&features=${FEATURE_SLUG}$`),
  )

  const outcome = await getSearchOutcome(page)
  expect(['results', 'empty']).toContain(outcome)
  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

test('categoría con q antiguo limpia q y conserva department', async ({ page, diagnostics }) => {
  await page.goto(
    `/categorias/${CATEGORY_SLUG}?q=${encodeURIComponent(VALID_SEARCH_TERM)}&department=${DEPARTMENT_SLUG}`,
  )
  await waitForCategoryPageToSettle(page)
  await expect(page).toHaveURL(
    new RegExp(`/categorias/${CATEGORY_SLUG}\\?department=${DEPARTMENT_SLUG}$`),
  )

  await expectNoVisibleLoaders(page)
  await expectNoUnexpectedRuntimeIssues(page, diagnostics)
})

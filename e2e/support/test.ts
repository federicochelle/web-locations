import { expect, test as base, type Page, type TestInfo } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

type HttpIssue = {
  url: string
  method: string
  resourceType: string
  status: number
}

type FailedRequestIssue = {
  url: string
  method: string
  resourceType: string
  errorText: string
}

type ConsoleIssue = {
  type: string
  text: string
  location: string | null
}

export type RuntimeDiagnostics = {
  pageErrors: string[]
  httpErrors: HttpIssue[]
  failedRequests: FailedRequestIssue[]
  consoleErrors: ConsoleIssue[]
}

const TRACKED_RESOURCE_TYPES = new Set([
  'document',
  'fetch',
  'script',
  'stylesheet',
  'xhr',
])

const IGNORED_FAILED_REQUEST_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com\//i,
  /^https:\/\/fonts\.gstatic\.com\//i,
]

function shouldIgnoreFailedRequest(url: string, resourceType: string, errorText: string) {
  if (!shouldTrackRequest(url, resourceType)) {
    return true
  }

  return errorText.includes('net::ERR_ABORTED')
}

function shouldTrackRequest(url: string, resourceType: string) {
  if (!TRACKED_RESOURCE_TYPES.has(resourceType)) {
    return false
  }

  return !IGNORED_FAILED_REQUEST_PATTERNS.some((pattern) => pattern.test(url))
}

async function persistDiagnostics(
  diagnostics: RuntimeDiagnostics,
  testInfo: TestInfo,
) {
  const outputPath = testInfo.outputPath('runtime-diagnostics.json')
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(diagnostics, null, 2))
}

export const test = base.extend<{ diagnostics: RuntimeDiagnostics }>({
  diagnostics: async ({ page }, use, testInfo) => {
    const diagnostics: RuntimeDiagnostics = {
      pageErrors: [],
      httpErrors: [],
      failedRequests: [],
      consoleErrors: [],
    }

    page.on('pageerror', (error) => {
      diagnostics.pageErrors.push(error.message)
    })

    page.on('response', (response) => {
      const request = response.request()
      const resourceType = request.resourceType()
      const url = response.url()

      if (!shouldTrackRequest(url, resourceType)) {
        return
      }

      const status = response.status()

      if (status >= 400) {
        diagnostics.httpErrors.push({
          url,
          method: request.method(),
          resourceType,
          status,
        })
      }
    })

    page.on('requestfailed', (request) => {
      const resourceType = request.resourceType()
      const url = request.url()
      const errorText = request.failure()?.errorText ?? 'unknown'

      if (shouldIgnoreFailedRequest(url, resourceType, errorText)) {
        return
      }

      diagnostics.failedRequests.push({
        url,
        method: request.method(),
        resourceType,
        errorText,
      })
    })

    page.on('console', (message) => {
      if (message.type() !== 'error') {
        return
      }

      const location = message.location()
      const resolvedLocation =
        location.url && location.lineNumber !== undefined
          ? `${location.url}:${location.lineNumber}`
          : location.url || null

      diagnostics.consoleErrors.push({
        type: message.type(),
        text: message.text(),
        location: resolvedLocation,
      })
    })

    await use(diagnostics)
    await persistDiagnostics(diagnostics, testInfo)
  },
})

export async function expectNoUnexpectedRuntimeIssues(
  page: Page,
  diagnostics: RuntimeDiagnostics,
  {
    allowRouteErrorBoundary = false,
  }: {
    allowRouteErrorBoundary?: boolean
  } = {},
) {
  const routeErrorVisible = await page
    .getByRole('heading', { name: /Ocurrió un problema/i })
    .isVisible()
    .catch(() => false)

  if (!allowRouteErrorBoundary) {
    expect(
      routeErrorVisible,
      'Apareció RouteErrorBoundary de forma inesperada.',
    ).toBe(false)
  }

  const blockingHttpErrors = diagnostics.httpErrors.filter(
    (issue) => issue.status >= 500,
  )

  expect(
    diagnostics.pageErrors,
    `Se detectaron errores JS inesperados:\n${diagnostics.pageErrors.join('\n')}`,
  ).toEqual([])
  expect(
    blockingHttpErrors,
    `Se detectaron respuestas HTTP 5xx inesperadas:\n${blockingHttpErrors
      .map((issue) => `${issue.status} ${issue.method} ${issue.resourceType} ${issue.url}`)
      .join('\n')}`,
  ).toEqual([])
  expect(
    diagnostics.failedRequests,
    `Se detectaron requests fallidas relevantes:\n${diagnostics.failedRequests
      .map((issue) => `${issue.method} ${issue.resourceType} ${issue.url} (${issue.errorText})`)
      .join('\n')}`,
  ).toEqual([])
  expect(
    diagnostics.consoleErrors,
    `Se detectaron errores de consola inesperados:\n${diagnostics.consoleErrors
      .map((issue) => `${issue.type} ${issue.text}${issue.location ? ` (${issue.location})` : ''}`)
      .join('\n')}`,
  ).toEqual([])
}

export { expect }

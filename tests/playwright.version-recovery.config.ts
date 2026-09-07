import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: '.', testMatch: 'version-recovery.browser.spec.ts', fullyParallel: false,
  timeout: 30_000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4187', browserName: 'chromium', headless: true },
  webServer: { cwd: fileURLToPath(new URL('..', import.meta.url)), command: 'node tests/serve-built-app.mjs', url: 'http://127.0.0.1:4187', reuseExistingServer: false },
})

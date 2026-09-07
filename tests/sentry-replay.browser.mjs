import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

// Requires npm run build with VITE_SENTRY_DSN. No telemetry leaves this test.
const server = await preview({ preview: { host: '127.0.0.1', port: 4193, strictPort: true } })
let browser
try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  const replays = []
  await page.route('**/*', async route => {
    const request = route.request()
    if (request.url().includes('/envelope/')) {
      const body = request.postData() || ''
      if (body.includes('replay_recording')) replays.push(body)
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
    if (new URL(request.url()).hostname === '127.0.0.1') return route.continue()
    return route.abort()
  })
  await page.goto('http://127.0.0.1:4193/?test=private-test@example.com#private-token-test')
  await page.evaluate(() => {
    const form = document.createElement('form')
    form.innerHTML = '<input type="email" value="private-test@example.com"><input type="password" value="private-password-test">private-form-test'
    document.body.append(form)
    const text = document.createElement('p')
    text.textContent = 'private-text-test'
    document.body.append(text)
    const image = document.createElement('img')
    image.src = '/private-image-test.jpg'
    document.body.append(image)
  })
  await page.waitForTimeout(5500)
  await page.evaluate(() => setTimeout(() => { throw new Error('SENTRY_REPLAY_TEST_PUBLIC_WEB') }, 0))
  await page.waitForTimeout(15000)
  assert.ok(replays.length, 'No Replay envelope observed; build with VITE_SENTRY_DSN first')
  const payload = replays.join('\n')
  for (const value of ['private-test@example.com', 'private-token-test', 'private-password-test',
    'private-form-test', 'private-text-test', 'private-image-test']) {
    assert.ok(!payload.includes(value), `Privacy sentinel leaked: ${value}`)
  }
  console.log('Browser Replay passed: recording sent after error; six privacy sentinels absent. All telemetry intercepted locally.')
} finally {
  await browser?.close()
  await new Promise(resolve => server.httpServer.close(resolve))
}

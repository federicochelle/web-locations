// Local static harness, NOT the Vercel runtime. Applies this repo's rewrite after
// filesystem lookup, so routing and browser recovery can be exercised offline.
import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('dist')
const config = JSON.parse(await readFile('vercel.json', 'utf8'))
const rewrites = config.rewrites.map(rule => ({ match: new RegExp(`^${rule.source}$`), destination: rule.destination }))
const mime = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' }
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    let file = path.resolve(root, `.${pathname}`)
    if (!file.startsWith(`${root}/`) && file !== root) { response.writeHead(400).end(); return }
    if (!(await stat(file).catch(() => null))?.isFile()) {
      const rewrite = rewrites.find(rule => rule.match.test(pathname))
      if (!rewrite) { response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return }
      file = path.join(root, rewrite.destination)
    }
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
    response.end(request.method === 'HEAD' ? undefined : body)
  } catch { response.writeHead(500).end('Local test server error') }
}).listen(4187, '127.0.0.1', () => console.log('Built-app routing harness: http://127.0.0.1:4187'))

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export function resolveBuildRelease(root: string, env: Record<string, string>, mode: string) {
  const deployment = process.env.VERCEL_DEPLOYMENT_ID
  if (deployment && /^dpl_[A-Za-z0-9]+$/.test(deployment)) return deployment
  let sha = process.env.VERCEL_GIT_COMMIT_SHA ?? ''
  if (!/^[a-f0-9]{40,64}$/i.test(sha)) {
    try { sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() } catch { sha = '' }
  }
  if (!/^[a-f0-9]{40,64}$/i.test(sha)) {
    throw new Error('Cannot identify build: provide VERCEL_DEPLOYMENT_ID or a valid Git checkout / VERCEL_GIT_COMMIT_SHA.')
  }
  // Same commit can be rebuilt with different files/config. Fingerprint real build inputs;
  // never export environment values or use a timestamp / fixed fallback.
  const hash = createHash('sha256')
  function add(relative: string) {
    const full = path.join(root, relative)
    hash.update(relative).update('\0').update(readFileSync(full)).update('\0')
  }
  function walk(relative: string) {
    for (const item of readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const next = path.join(relative, item.name)
      if (item.isDirectory()) walk(next)
      else if (item.isFile()) add(next)
    }
  }
  walk('src'); walk('public')
  for (const file of ['index.html', 'logo.webp', 'vite.config.ts', 'scripts/build-release.ts', 'package-lock.json']) add(file)
  hash.update(JSON.stringify({ mode, node: process.version, env: Object.entries(env).sort(([a], [b]) => a.localeCompare(b)) }))
  return `git-${sha}-${hash.digest('hex').slice(0, 20)}`
}

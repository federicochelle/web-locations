import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { resolveBuildRelease } from './scripts/build-release.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const release = resolveBuildRelease(__dirname, loadEnv(mode, __dirname, 'VITE_'), mode)
  const shouldUploadSentrySourceMaps =
    mode === 'production' &&
    Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT)

  return {
    define: { __APP_RELEASE__: JSON.stringify(release) },
    build: {
      sourcemap: mode === 'production',
    },
    plugins: [react(), tailwindcss(), {
      name: 'app-build-release',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ release }) })
      },
    }, sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      disable: !shouldUploadSentrySourceMaps,
      telemetry: false,
      release: {
        name: release,
        inject: true,
        create: true,
        finalize: true,
        setCommits: {
          auto: true,
          ignoreMissing: true,
          ignoreEmpty: true,
        },
      },
      sourcemaps: {
        filesToDeleteAfterUpload: ['dist/**/*.map'],
      },
    })],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

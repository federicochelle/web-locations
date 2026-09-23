import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { resolveBuildRelease } from './scripts/build-release.ts'

const homeMosaicLcpResponsiveVariants = [
  'WhatsApp Image 2026-07-27 at 9.08.38 PM (2)-480w.webp',
  'WhatsApp Image 2026-07-27 at 9.08.38 PM (2)-768w.webp',
  'WhatsApp Image 2026-07-27 at 9.08.38 PM (2)-960w.webp',
] as const

function appHomeMosaicLcpPreload() {
  return {
    name: 'app-home-mosaic-lcp-preload',
    enforce: 'post' as const,
    transformIndexHtml(html: string, context: { bundle?: Record<string, { type: string, fileName: string }> }) {
      if (!context.bundle) {
        return html
      }

      return homeMosaicLcpResponsiveVariants.reduce((updatedHtml, variant) => {
        const sourcePath = `/src/assets/home-mosaic/responsive/${variant}`
        const variantPrefix = `assets/${variant.replace(/\.webp$/, '-')}`
        const asset = Object.values(context.bundle ?? {}).find(
          (bundleItem) => bundleItem.type === 'asset' && bundleItem.fileName.startsWith(variantPrefix),
        )

        if (!asset) {
          return updatedHtml
        }

        return updatedHtml.replaceAll(sourcePath, encodeURI(`/${asset.fileName}`))
      }, html)
    },
  }
}

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
    plugins: [react(), tailwindcss(), appHomeMosaicLcpPreload(), {
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

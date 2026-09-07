import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { resolveBuildRelease } from './scripts/build-release.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const release = resolveBuildRelease(__dirname, loadEnv(mode, __dirname, 'VITE_'), mode)
  return {
    define: { __APP_RELEASE__: JSON.stringify(release) },
    plugins: [react(), tailwindcss(), {
      name: 'app-build-release',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ release }) })
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

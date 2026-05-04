import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync, mkdirSync } from 'fs'

// Plugin to copy schema.sql to dist
function copySchemaPlugin() {
  return {
    name: 'copy-schema',
    closeBundle() {
      try {
        mkdirSync(resolve(__dirname, 'dist/main/db'), { recursive: true })
        copyFileSync(
          resolve(__dirname, 'src/main/db/schema.sql'),
          resolve(__dirname, 'dist/main/db/schema.sql')
        )
        console.log('[Build] schema.sql copied to dist/main/db/')
      } catch (err) {
        console.warn('[Build] Could not copy schema.sql:', err)
      }
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySchemaPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
    root: resolve(__dirname, 'src/renderer'),
    build: {
      outDir: resolve(__dirname, 'dist/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer')
      }
    }
  }
})

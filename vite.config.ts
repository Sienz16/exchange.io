import build from '@hono/vite-build/cloudflare-workers'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import client from 'honox/vite/client'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'

const common = {
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './app')
    }
  }
}

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      ...common,
      plugins: [
        client({ jsxImportSource: 'react' })
      ],
      build: {
        rollupOptions: {
          input: ['./app/client.ts', './app/style.css'],
          output: {
            entryFileNames: 'static/client.js',
            chunkFileNames: 'static/assets/[name]-[hash].js',
            assetFileNames: 'static/assets/[name].[ext]'
          }
        }
      }
    }
  }
  // Vite's SSR module runner does not expose process.env to app modules, so
  // inject the runtime env vars the server reads (DATABASE_URL etc.) here.
  // Client build deliberately omits this block — no secrets reach the browser.
  const env = loadEnv(mode, process.cwd(), '')
  return {
    ...common,
    ssr: { external: ['react', 'react-dom'] },
    define: {
      'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL ?? ''),
      'process.env.DAILY_RATE_BASE': JSON.stringify(env.DAILY_RATE_BASE ?? 'USD'),
    },
    plugins: [
      honox({
        client: { input: ['/app/client.ts', '/app/style.css'] }
      }),
      tailwindcss(),
      build()
    ]
  }
})

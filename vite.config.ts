import build from '@hono/vite-build/cloudflare-workers'
import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import client from 'honox/vite/client'
import { defineConfig } from 'vite'
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
  return {
    ...common,
    ssr: { external: ['react', 'react-dom'] },
    plugins: [
      honox({
        client: { input: ['/app/client.ts', '/app/style.css'] }
      }),
      tailwindcss(),
      build()
    ]
  }
})

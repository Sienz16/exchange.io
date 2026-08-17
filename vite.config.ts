import tailwindcss from '@tailwindcss/vite'
import honox from 'honox/vite'
import client from 'honox/vite/client'
import { createLogger, defineConfig } from 'vite'
import path from 'node:path'

// Deployment target: 'bun' (default), 'node', or 'cloudflare-workers'.
// Override per build with DEPLOY_TARGET — e.g. for Cloudflare Workers:
//   DEPLOY_TARGET=cloudflare-workers vite build
const deployTarget = process.env.DEPLOY_TARGET ?? 'bun'

const adapters = {
  'bun': () => import('@hono/vite-build/bun').then((m) => m.default({ staticRoot: './dist' })),
  'node': () => import('@hono/vite-build/node').then((m) => m.default({ staticRoot: './dist' })),
  'cloudflare-workers': () => import('@hono/vite-build/cloudflare-workers').then((m) => m.default()),
} as const

if (!(deployTarget in adapters)) {
  throw new Error(`Unknown DEPLOY_TARGET "${deployTarget}". Use one of: ${Object.keys(adapters).join(', ')}`)
}

const logger = createLogger()
const common = {
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './app')
    }
  },
}

export default defineConfig(async ({ mode }) => {
  if (mode === 'client') {
    return {
      ...common,
      customLogger: {
        ...logger,
        warn(message: Parameters<typeof logger.warn>[0], options: Parameters<typeof logger.warn>[1]) {
          if (message.includes('`esbuild` option was specified by "honox-vite-client" plugin')) return
          logger.warn(message, options)
        },
      },
      plugins: [
        client({ jsxImportSource: 'react' })
      ],
      build: {
        // Lightning CSS does not understand Tailwind v4's @theme/@tailwind
        // directives; Tailwind's Vite plugin handles them before output.
        cssMinify: false,
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
  // Runtime configuration (DATABASE_URL, DAILY_RATE_BASE) is always read from
  // the real process environment at runtime — never inlined into the bundle.
  // Bun loads .env automatically in development; in production supply real
  // env vars (VPS) or Workers secrets (wrangler secret put DATABASE_URL).
  const buildPlugin = await adapters[deployTarget as keyof typeof adapters]()
  return {
    ...common,
    ssr: { external: ['react', 'react-dom'] },
    plugins: [
      honox({
        client: { input: ['/app/client.ts', '/app/style.css'] }
      }),
      tailwindcss(),
      buildPlugin
    ]
  }
})

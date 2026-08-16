import { showRoutes } from 'hono/dev'
import { createApp } from 'honox/server'
import { corsHeaders } from './lib/api'
import { runDailyRateFetch } from './lib/jobs/fetch-rates'

type BunCron = { cron: (schedule: string, callback: () => void | Promise<void>) => void }
const runtime = globalThis as typeof globalThis & { Bun?: BunCron }
if (runtime.Bun && typeof process !== 'undefined' && process.env.NODE_ENV !== 'development') {
  runtime.Bun.cron('0 0 * * *', async () => { await runDailyRateFetch() })
}

const app = createApp({
  init(app) {
    app.options('/api/*', (c) => new Response(null, { status: 204, headers: corsHeaders }))
    app.use('*', async (c, next) => {
      await next()
      if (c.req.path.startsWith('/api/')) {
        for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
      }
    })
  },
})

showRoutes(app)

export default app

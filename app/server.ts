import { showRoutes } from 'hono/dev'
import { createApp } from 'honox/server'
import { runDailyRateFetch } from './lib/jobs/fetch-rates'

const app = createApp()

if (process.env.NODE_ENV === 'development') showRoutes(app)

const scheduled: ExportedHandlerScheduledHandler = async () => {
  const result = await runDailyRateFetch()
  if (result.status === 'error') console.error('daily rate fetch failed:', result.error)
}

// Daily refresh of the reference rates. Under Bun (the default runtime) the
// built-in cron drives it; the schedule must match wrangler.jsonc, where the
// same job runs via the `scheduled` handler on Cloudflare Workers.
type BunCron = { cron: (schedule: string, callback: () => void | Promise<void>) => void }
const runtime = globalThis as typeof globalThis & { Bun?: Partial<BunCron> }
if (typeof runtime.Bun?.cron === 'function' && process.env.NODE_ENV !== 'development') {
  runtime.Bun.cron('30 0 * * *', async () => { await runDailyRateFetch() })
}

// Exported as a Workers ExportedHandler-style object rather than the bare app:
// the Cloudflare build entry only imports this module's default export and
// merges its members (e.g. `scheduled`) into the deployed worker, so a named
// export would be dropped. Bun serves any default export exposing `fetch`.
export default { fetch: app.fetch, scheduled }

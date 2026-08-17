import { showRoutes } from 'hono/dev'
import { createApp } from 'honox/server'
import { runRollup } from './lib/analytics'
import { runDailyRateFetch } from './lib/jobs/fetch-rates'

const app = createApp()

if (process.env.NODE_ENV === 'development') showRoutes(app)

const ROLLUP_CRON = '3 * * * *'

const scheduled: ExportedHandlerScheduledHandler = async (event) => {
  if (event?.cron === ROLLUP_CRON) {
    await runRollup()
    return
  }
  const result = await runDailyRateFetch()
  if (result.status === 'error') console.error('daily rate fetch failed:', result.error)
}

// Daily refresh of the reference rates plus hourly telemetry rollup. Under Bun
// (the default runtime) the built-in cron drives them; the schedules must match
// wrangler.jsonc, where the same jobs run via the `scheduled` handler on
// Cloudflare Workers.
type BunCron = { cron: (schedule: string, callback: () => void | Promise<void>) => void }
const runtime = globalThis as typeof globalThis & { Bun?: Partial<BunCron> }
if (typeof runtime.Bun?.cron === 'function' && process.env.NODE_ENV !== 'development') {
  runtime.Bun.cron('30 0 * * *', async () => { await runDailyRateFetch() })
  runtime.Bun.cron(ROLLUP_CRON, () => { void runRollup() })
}

// Exported as a Workers ExportedHandler-style object rather than the bare app:
// the Cloudflare build entry only imports this module's default export and
// merges its members (e.g. `scheduled`) into the deployed worker, so a named
// export would be dropped. Bun serves any default export exposing `fetch`.
export default { fetch: app.fetch, scheduled }

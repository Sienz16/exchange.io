import { showRoutes } from 'hono/dev'
import { createApp } from 'honox/server'
import { createRequestRecorder, getAnalyticsWriter, runRollup } from './lib/analytics'
import { runDailyRateFetch } from './lib/jobs/fetch-rates'

const app = createApp()
const telemetry = createRequestRecorder(getAnalyticsWriter())
if (typeof process !== 'undefined') process.once('beforeExit', () => { void telemetry.shutdown() })
const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

function requestId(request: Request): string {
  const incoming = request.headers.get('x-request-id')?.trim()
  return incoming && /^[A-Za-z0-9._-]{1,80}$/.test(incoming) ? incoming : crypto.randomUUID()
}

async function fetch(request: Request, env?: {}, ctx?: ExecutionContext): Promise<Response> {
  const response = await app.fetch(request, env, ctx)
  for (const [key, value] of Object.entries(securityHeaders)) response.headers.set(key, value)
  if (request.url.includes('/admin')) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  response.headers.set('X-Request-ID', requestId(request))
  return response
}

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
export default { fetch, scheduled }

import type { MiddlewareHandler } from 'hono'
import { cors } from '../../lib/api'
import { buildEntry, createRequestRecorder, getAnalyticsWriter } from '../../lib/analytics'

const recorder = createRequestRecorder(getAnalyticsWriter(), {
  onError: (error) => console.error('analytics flush failed:', error),
})

/** Records every completed API request; never breaks the response it measures. */
const apiTelemetry: MiddlewareHandler = async (c, next) => {
  const start = performance.now()
  await next()
  if (c.req.path === '/api/health') return // monitoring pings are not product usage
  try {
    recorder.record(await buildEntry({
      path: c.req.path,
      query: c.req.query(),
      status: c.res.status,
      durationMs: performance.now() - start,
      headers: c.req.raw.headers,
    }))
  } catch {
    /* telemetry must never take down a request */
  }
}

// CORS first: OPTIONS preflights short-circuit before telemetry runs.
export default [cors, apiTelemetry] satisfies Array<MiddlewareHandler>

import type { MiddlewareHandler } from 'hono'
import { cors } from '../../lib/api'
import { buildEntry, clientIp, createRequestRecorder, getAnalyticsWriter } from '../../lib/analytics'
import { createRateLimiter } from '../../lib/rate-limit'

const recorder = createRequestRecorder(getAnalyticsWriter(), {
  onError: (error) => console.error('analytics flush failed:', error),
})
const limiter = createRateLimiter({ limit: 120, windowMs: 60_000 })
const API_RATE_LIMIT = 120

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

const apiRateLimit: MiddlewareHandler = async (c, next) => {
  if (c.req.path === '/api/health' || c.req.method === 'OPTIONS') return next()
  const result = limiter.check(clientIp(c.req.raw.headers))
  c.header('X-RateLimit-Limit', String(API_RATE_LIMIT))
  c.header('X-RateLimit-Remaining', String(result.remaining))
  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfter))
    return c.json({ error: 'rate_limited', message: 'Too many requests', details: { retry_after_seconds: result.retryAfter } }, 429)
  }
  await next()
}

// CORS first: OPTIONS preflights short-circuit before telemetry runs.
export default [cors, apiRateLimit, apiTelemetry] satisfies Array<MiddlewareHandler>

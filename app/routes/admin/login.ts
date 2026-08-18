import { createRoute } from 'honox/factory'
import { adminToken, constantTimeEqual, createSessionCookie } from '../../lib/admin-auth'
import { clientIp } from '../../lib/analytics'
import { createRateLimiter } from '../../lib/rate-limit'

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 })
const MAX_BODY_BYTES = 8_192

export const POST = createRoute(async (c) => {
  const limit = limiter.check(clientIp(c.req.raw.headers))
  if (!limit.allowed) return new Response(null, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } })
  const contentLength = Number(c.req.header('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) return new Response(null, { status: 413 })
  const token = adminToken()
  const form = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>)
  const submitted = typeof form.token === 'string' ? form.token : ''
  if (!token || !submitted || !constantTimeEqual(submitted, token)) {
    return new Response(null, { status: 303, headers: { Location: '/admin?error=1' } })
  }
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': await createSessionCookie(token) } })
})

import { createRoute } from 'honox/factory'
import { adminToken, constantTimeEqual, createSessionCookie } from '../../lib/admin-auth'

export const POST = createRoute(async (c) => {
  const token = adminToken()
  const form = await c.req.parseBody().catch(() => ({}) as Record<string, unknown>)
  const submitted = typeof form.token === 'string' ? form.token : ''
  if (!token || !submitted || !constantTimeEqual(submitted, token)) {
    return new Response(null, { status: 303, headers: { Location: '/admin?error=1' } })
  }
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': await createSessionCookie(token) } })
})

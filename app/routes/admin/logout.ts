import { createRoute } from 'honox/factory'
import { clearSessionCookie, revokeSessionCookie } from '../../lib/admin-auth'

export const POST = createRoute((c) => {
  revokeSessionCookie(c.req.header('cookie'))
  return new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': clearSessionCookie() } })
})

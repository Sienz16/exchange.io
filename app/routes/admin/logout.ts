import { createRoute } from 'honox/factory'
import { clearSessionCookie } from '../../lib/admin-auth'

export const POST = createRoute(() =>
  new Response(null, { status: 303, headers: { Location: '/admin', 'Set-Cookie': clearSessionCookie() } }))

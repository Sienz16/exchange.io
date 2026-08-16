import type { MiddlewareHandler } from 'hono'
import { corsHeaders } from '../../lib/api'

const middleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  await next()
  for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
}

export default [middleware]

import type { MiddlewareHandler } from 'hono'
import { corsHeaders } from '../../lib/api'

const middleware: MiddlewareHandler = async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
    return next()
  }
  await next()
  for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
}

export default [middleware]

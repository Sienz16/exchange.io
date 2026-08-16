import type { MiddlewareHandler } from 'hono'
import { cors } from '../../lib/api'

export default [cors] satisfies Array<MiddlewareHandler>

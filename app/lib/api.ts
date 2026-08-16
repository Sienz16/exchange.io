import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiError } from './types'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function cors(c: Context, next: () => Promise<void>) {
  if (c.req.path.startsWith('/api/') && c.req.method === 'OPTIONS') return options(c)
  await next()
  if (c.req.path.startsWith('/api/')) {
    for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
  }
}

export function json<T>(c: Context, body: T, status: ContentfulStatusCode = 200) {
  return c.json(body, status, corsHeaders)
}

export function options(c: Context) {
  return new Response(null, { status: 204, headers: corsHeaders })
}

export function apiError(c: Context, error: ApiError, status: ContentfulStatusCode = 400) {
  return json(c, error, status)
}

export function unknownError(c: Context, error: unknown) {
  return apiError(c, {
    error: 'service_unavailable',
    message: error instanceof Error ? error.message : 'Rate service is unavailable',
    details: null,
  }, 503)
}

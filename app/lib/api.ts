import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiError } from './types'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function cors(c: Context, next: () => Promise<void>) {
  if (c.req.path.startsWith('/api/') && c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  await next()
  if (c.req.path.startsWith('/api/')) {
    for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
  }
}

export function json<T>(c: Context, body: T, status: ContentfulStatusCode = 200) {
  const payload = JSON.stringify(body)
  const headers: Record<string, string> = { ...corsHeaders, 'Cache-Control': status >= 400 ? 'no-store' : 'public, max-age=300, stale-while-revalidate=600' }
  if (status < 400) {
    let hash = 2166136261
    for (let index = 0; index < payload.length; index += 1) {
      hash ^= payload.charCodeAt(index)
      hash = Math.imul(hash, 16777619)
    }
    const etag = `W/\"${(hash >>> 0).toString(16)}\"`
    headers.ETag = etag
    if (c.req.header('If-None-Match') === etag) return new Response(null, { status: 304, headers })
  }
  return new Response(payload, { status, headers: { ...headers, 'Content-Type': 'application/json; charset=UTF-8' } })
}

export function apiError(c: Context, error: ApiError, status: ContentfulStatusCode = 400) {
  return c.json(error, status, { ...corsHeaders, 'Cache-Control': 'no-store' })
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error && 'details' in error
}

const apiErrorStatus: Record<string, ContentfulStatusCode> = {
  historical_unavailable: 503,
  forecast_unavailable: 503,
  future_date: 422,
}

/** Maps thrown ApiError objects (validation, domain, source failures) to responses. */
export function handleApiError(c: Context, error: unknown) {
  if (isApiError(error)) return apiError(c, error, apiErrorStatus[error.error] ?? 400)
  return unknownError(c, error)
}

export function unknownError(c: Context, error: unknown) {
  console.error('API request failed:', error)
  return apiError(c, {
    error: 'service_unavailable',
    message: 'Rate service is unavailable',
    details: null,
  }, 503)
}

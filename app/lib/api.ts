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
  return c.json(body, status, corsHeaders)
}

export function apiError(c: Context, error: ApiError, status: ContentfulStatusCode = 400) {
  return json(c, error, status)
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
  return apiError(c, {
    error: 'service_unavailable',
    message: error instanceof Error ? error.message : 'Rate service is unavailable',
    details: null,
  }, 503)
}

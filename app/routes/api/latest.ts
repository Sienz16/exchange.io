import { createRoute } from 'honox/factory'
import { apiError, json, options, unknownError } from '../../lib/api'
import { getLatest } from '../../lib/rates'
import { latestQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  if (c.req.method === 'OPTIONS') return options(c)

  try {
    const query = parseQuery(latestQuerySchema, c.req.query())
    return json(c, await getLatest(query.base))
  } catch (error) {
    if (isApiError(error)) return apiError(c, error)
    return unknownError(c, error)
  }
})

export const OPTIONS = createRoute((c) => options(c))

function isApiError(error: unknown): error is { error: string; message: string; details: unknown } {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error && 'details' in error
}

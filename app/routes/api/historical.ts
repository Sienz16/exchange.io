import { createRoute } from 'honox/factory'
import { apiError, json, options, unknownError } from '../../lib/api'
import { isSupportedCurrency } from '../../lib/rates'
import { historicalQuerySchema, parseQuery } from '../../lib/validation'
import { getDatabase } from '../../lib/db'

export default createRoute(async (c) => {
  if (c.req.method === 'OPTIONS') return options(c)
  try {
    const query = parseQuery(historicalQuerySchema, c.req.query())
    if (!isSupportedCurrency(query.base)) return apiError(c, { error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { currency: query.base } })
    const database = getDatabase()
    if (!database) return apiError(c, { error: 'historical_unavailable', message: 'Historical data is not configured', details: null }, 503)
    return json(c, await database.getHistorical(query.date, query.base).then((value) => value ?? Promise.reject(new Error('Historical rate is unavailable'))))
  } catch (error) {
    if (isApiError(error)) return apiError(c, error)
    return unknownError(c, error)
  }
})

export const OPTIONS = createRoute((c) => options(c))

function isApiError(error: unknown): error is { error: string; message: string; details: unknown } {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error && 'details' in error
}

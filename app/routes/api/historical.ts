import { createRoute } from 'honox/factory'
import { apiError, json, options, unknownError } from '../../lib/api'
import { getHistorical, isSupportedCurrency } from '../../lib/rates'
import { historicalQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  if (c.req.method === 'OPTIONS') return options(c)
  try {
    const query = parseQuery(historicalQuerySchema, c.req.query())
    if (!isSupportedCurrency(query.base)) return apiError(c, { error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { currency: query.base } })
    return json(c, await getHistorical(query.date, query.base))
  } catch (error) {
    if (isApiError(error)) return apiError(c, error)
    return unknownError(c, error)
  }
})

export const OPTIONS = createRoute((c) => options(c))

function isApiError(error: unknown): error is { error: string; message: string; details: unknown } {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error && 'details' in error
}

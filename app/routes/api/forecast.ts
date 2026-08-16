import { createRoute } from 'honox/factory'
import { apiError, json, options, unknownError } from '../../lib/api'
import { forecastPair } from '../../lib/forecast'
import { isSupportedCurrency } from '../../lib/rates'
import { forecastQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  if (c.req.method === 'OPTIONS') return options(c)
  try {
    const query = parseQuery(forecastQuerySchema, c.req.query())
    if (!isSupportedCurrency(query.from) || !isSupportedCurrency(query.to)) return apiError(c, {
      error: 'unsupported_currency',
      message: 'Currency is not supported by the rate source',
      details: { from: query.from, to: query.to },
    })
    return json(c, await forecastPair(query))
  } catch (error) {
    if (isApiError(error)) return apiError(c, error, error.error === 'forecast_unavailable' ? 503 : 400)
    return unknownError(c, error)
  }
})

export const OPTIONS = createRoute((c) => options(c))

function isApiError(error: unknown): error is { error: string; message: string; details: unknown } {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error && 'details' in error
}

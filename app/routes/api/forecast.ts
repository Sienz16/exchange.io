import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { forecastPair } from '../../lib/forecast'
import { isSupportedCurrency } from '../../lib/rates'
import { forecastQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(forecastQuerySchema, c.req.query())
    if (!isSupportedCurrency(query.from) || !isSupportedCurrency(query.to)) {
      return apiError(c, {
        error: 'unsupported_currency',
        message: 'Currency is not supported by the rate source',
        details: { from: query.from, to: query.to },
      })
    }
    return await json(c, await forecastPair(query))
  } catch (error) {
    return handleApiError(c, error)
  }
})

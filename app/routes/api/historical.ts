import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { getHistorical, isSupportedCurrency } from '../../lib/rates'
import { historicalQuerySchema, isFutureDate, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(historicalQuerySchema, c.req.query())
    if (isFutureDate(query.date)) {
      return apiError(c, {
        error: 'future_date',
        message: 'Date cannot be in the future',
        details: { date: query.date },
      }, 422)
    }
    if (!isSupportedCurrency(query.base)) {
      return apiError(c, {
        error: 'unsupported_currency',
        message: 'Currency is not supported by the rate source',
        details: { currency: query.base },
      })
    }
    return json(c, await getHistorical(query.date, query.base))
  } catch (error) {
    return handleApiError(c, error)
  }
})

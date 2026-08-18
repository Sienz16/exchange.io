import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { convert, isSupportedCurrency } from '../../lib/rates'
import { convertQuerySchema, isFutureDate, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(convertQuerySchema, c.req.query())
    for (const currency of [query.from, query.to]) {
      if (!isSupportedCurrency(currency)) {
        return apiError(c, {
          error: 'unsupported_currency',
          message: 'Currency is not supported by the rate source',
          details: { currency },
        })
      }
    }
    if (query.date && isFutureDate(query.date)) {
      return apiError(c, {
        error: 'future_date',
        message: 'Date cannot be in the future',
        details: { date: query.date },
      }, 422)
    }
    return await json(c, await convert({ from: query.from, to: query.to, amount: query.amount, date: query.date }))
  } catch (error) {
    return handleApiError(c, error)
  }
})

import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { getTimeSeries } from '../../lib/db'
import { isSupportedCurrency } from '../../lib/rates'
import { isFutureDate, parseQuery, parseSymbols, timeseriesQuerySchema } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(timeseriesQuerySchema, c.req.query())
    if (isFutureDate(query.start) || isFutureDate(query.end) || query.start > query.end) return apiError(c, { error: 'invalid_query', message: 'Date range is invalid', details: { start: query.start, end: query.end } })
    if (!isSupportedCurrency(query.base)) return apiError(c, { error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { currency: query.base } })
    return await json(c, { base: query.base, start: query.start, end: query.end, data: await getTimeSeries(query.start, query.end, query.base, parseSymbols(query.symbols)) })
  } catch (error) { return handleApiError(c, error) }
})

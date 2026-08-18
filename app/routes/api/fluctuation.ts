import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { getTimeSeries } from '../../lib/db'
import { isSupportedCurrency } from '../../lib/rates'
import { isFutureDate, fluctuationQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(fluctuationQuerySchema, c.req.query())
    if (isFutureDate(query.start) || isFutureDate(query.end) || query.start > query.end) return apiError(c, { error: 'invalid_query', message: 'Date range is invalid', details: { start: query.start, end: query.end } })
    if (!isSupportedCurrency(query.base)) return apiError(c, { error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { currency: query.base } })
    const series = await getTimeSeries(query.start, query.end, query.base)
    const first = series[0]
    const last = series[series.length - 1]
    const symbols = [...new Set(series.flatMap((point) => Object.keys(point.rates)))].sort()
    const rates = Object.fromEntries(symbols.map((symbol) => {
      const start = first?.rates[symbol] ?? null
      const end = last?.rates[symbol] ?? null
      const change = start != null && end != null ? end - start : null
      return [symbol, { start, end, change, change_pct: change != null && start ? (change / start) * 100 : null }]
    }))
    return await json(c, { base: query.base, start: query.start, end: query.end, rates })
  } catch (error) { return handleApiError(c, error) }
})

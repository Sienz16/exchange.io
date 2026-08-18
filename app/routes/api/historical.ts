import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { getHistorical, isSupportedCurrency } from '../../lib/rates'
import { historicalQuerySchema, isFutureDate, parseQuery, parseSymbols } from '../../lib/validation'

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
    const snapshot = await getHistorical(query.date, query.base)
    const symbols = parseSymbols(query.symbols)
    return await json(c, symbols ? { ...snapshot, rates: Object.fromEntries(symbols.filter((symbol) => snapshot.rates[symbol] !== undefined).map((symbol) => [symbol, snapshot.rates[symbol]])) } : snapshot)
  } catch (error) {
    return handleApiError(c, error)
  }
})

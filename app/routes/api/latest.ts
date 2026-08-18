import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { getLatest, isSupportedCurrency } from '../../lib/rates'
import { latestQueryWithSymbolsSchema, parseQuery, parseSymbols } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(latestQueryWithSymbolsSchema, c.req.query())
    if (!isSupportedCurrency(query.base)) {
      return apiError(c, {
        error: 'unsupported_currency',
        message: 'Currency is not supported by the rate source',
        details: { currency: query.base },
      })
    }
    const snapshot = await getLatest(query.base)
    const symbols = parseSymbols(query.symbols)
    return await json(c, symbols ? { ...snapshot, rates: Object.fromEntries(symbols.filter((symbol) => snapshot.rates[symbol] !== undefined).map((symbol) => [symbol, snapshot.rates[symbol]])) } : snapshot)
  } catch (error) {
    return handleApiError(c, error)
  }
})

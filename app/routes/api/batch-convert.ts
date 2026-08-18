import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { convert, isSupportedCurrency } from '../../lib/rates'
import { batchConvertQuerySchema, isFutureDate, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(batchConvertQuerySchema, c.req.query())
    const to = [...new Set(query.to.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean))]
    if (!to.length || to.some((currency) => !isSupportedCurrency(currency)) || !isSupportedCurrency(query.from)) return apiError(c, { error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { from: query.from, to } })
    if (query.date && isFutureDate(query.date)) return apiError(c, { error: 'future_date', message: 'Date cannot be in the future', details: { date: query.date } }, 422)
    const results = await Promise.all(to.map((currency) => convert({ from: query.from, to: currency, amount: query.amount, date: query.date })))
    return await json(c, { from: query.from, amount: query.amount, date: query.date ?? null, results })
  } catch (error) { return handleApiError(c, error) }
})

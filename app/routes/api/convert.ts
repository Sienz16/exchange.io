import { createRoute } from 'honox/factory'
import { apiError, json, options, unknownError } from '../../lib/api'
import { convert, isSupportedCurrency } from '../../lib/rates'
import { convertQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  if (c.req.method === 'OPTIONS') return options(c)

  try {
    const query = parseQuery(convertQuerySchema, c.req.query())
    for (const currency of [query.from, query.to]) {
      if (!isSupportedCurrency(currency)) return apiError(c, {
        error: 'unsupported_currency',
        message: 'Currency is not supported by the rate source',
        details: { currency },
      })
    }
    if (query.date && isFutureDate(query.date)) {
      return apiError(c, {
        error: 'future_date',
        message: 'Date cannot be in the future',
        details: { date: query.date },
      }, 422)
    }
    if (query.date) {
      return apiError(c, {
        error: 'historical_unavailable',
        message: 'Dated conversion is unavailable until historical data is enabled',
        details: { date: query.date },
      }, 422)
    }
    return json(c, await convert({ from: query.from, to: query.to, amount: query.amount }))
  } catch (error) {
    if (isFutureQueryError(error)) return apiError(c, {
      error: 'future_date',
      message: 'Date cannot be in the future',
      details: error.details,
    }, 422)
    if (isFutureDateError(error)) return apiError(c, error, 422)
    if (isApiError(error)) return apiError(c, error)
    return unknownError(c, error)
  }
})

export const OPTIONS = createRoute((c) => options(c))

function isFutureDateError(error: unknown): error is { error: 'future_date'; message: string; details: unknown } {
  return typeof error === 'object' && error !== null && 'error' in error && error.error === 'future_date'
}

function isFutureDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return date > today
}

function isFutureQueryError(error: unknown): error is { details: Array<{ message?: string }> } {
  return typeof error === 'object' && error !== null && 'details' in error &&
    Array.isArray(error.details) && error.details.some((issue) => issue?.message === 'Date cannot be in the future')
}

function isApiError(error: unknown): error is { error: string; message: string; details: unknown } {
  return typeof error === 'object' && error !== null && 'error' in error && 'message' in error && 'details' in error
}

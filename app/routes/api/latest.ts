import { createRoute } from 'honox/factory'
import { apiError, handleApiError, json } from '../../lib/api'
import { getLatest, isSupportedCurrency } from '../../lib/rates'
import { latestQuerySchema, parseQuery } from '../../lib/validation'

export default createRoute(async (c) => {
  try {
    const query = parseQuery(latestQuerySchema, c.req.query())
    if (!isSupportedCurrency(query.base)) {
      return apiError(c, {
        error: 'unsupported_currency',
        message: 'Currency is not supported by the rate source',
        details: { currency: query.base },
      })
    }
    return await json(c, await getLatest(query.base))
  } catch (error) {
    return handleApiError(c, error)
  }
})

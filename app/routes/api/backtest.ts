import { createRoute } from 'honox/factory'
import { handleApiError, json } from '../../lib/api'
import { getDatabase } from '../../lib/db'
import { isSupportedCurrency } from '../../lib/rates'
import { currencySchema, parseQuery } from '../../lib/validation'
import { rollingBacktest } from '../../lib/forecast'
import { z } from 'zod'

const schema = z.object({ from: currencySchema, to: currencySchema })
export default createRoute(async (c) => {
  try {
    const query = parseQuery(schema, c.req.query())
    if (!isSupportedCurrency(query.from) || !isSupportedCurrency(query.to)) return c.json({ error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: query }, 400)
    const history = getDatabase()?.getPairHistory ? await getDatabase()!.getPairHistory!(query.from, query.to) : []
    return await json(c, { from: query.from, to: query.to, model_version: 'trend-blend-v3', ...rollingBacktest(history) })
  } catch (error) { return handleApiError(c, error) }
})

import { createRoute } from 'honox/factory'
import { json, options, unknownError } from '../../lib/api'
import { getLatest } from '../../lib/rates'

const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'])

export default createRoute(async (c) => {
  if (c.req.method === 'OPTIONS') return options(c)

  try {
    const snapshot = await getLatest('USD')
    const codes = Object.keys(snapshot.rates).sort()
    return json(c, {
      currencies: codes.map((code) => ({ code, decimals: zeroDecimalCurrencies.has(code) ? 0 : 2 })),
      source: snapshot.source,
      fetched_at: snapshot.fetched_at,
    })
  } catch (error) {
    return unknownError(c, error)
  }
})

export const OPTIONS = createRoute((c) => options(c))

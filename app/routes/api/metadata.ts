import { createRoute } from 'honox/factory'
import { json } from '../../lib/api'
import { currencyMeta, symbolFor } from '../../lib/currency-meta'

export default createRoute(async (c) => json(c, { currencies: Object.entries(currencyMeta).sort(([a], [b]) => a.localeCompare(b)).map(([code, meta]) => ({ code, ...meta, symbol: symbolFor(code) ?? null })) }))

import { fetchLatestRates } from './sources/er-api'
import type { ConversionResult, RateResult, RateSnapshot } from './types'

const CACHE_TTL_MS = 60 * 60 * 1000
type Source = (base: string) => Promise<RateSnapshot>
type Clock = () => Date

export function createRateService(source: Source = fetchLatestRates, clock: Clock = () => new Date()) {
  const cache = new Map<string, RateSnapshot>()

  async function getLatest(base: string): Promise<RateResult> {
    const key = base.toUpperCase()
    const cached = cache.get(key)
    const now = clock()
    if (cached && now.getTime() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) return cached

    try {
      const snapshot = await source(key)
      cache.set(key, snapshot)
      return snapshot
    } catch (error) {
      if (cached) return cached
      throw error
    }
  }

  return {
    getLatest,
    async convert(input: { from: string; to: string; amount: number; date?: string }): Promise<ConversionResult> {
      if (input.date) throw new Error('Historical conversion is not available')
      const from = input.from.toUpperCase()
      const to = input.to.toUpperCase()
      const snapshot = await getLatest(from)
      const fromRate = snapshot.rates[from] ?? (from === snapshot.base ? 1 : undefined)
      const toRate = snapshot.rates[to]
      if (fromRate === undefined || toRate === undefined) throw new Error(`Unsupported currency: ${to}`)
      const rate = toRate / fromRate
      return {
        from,
        to,
        amount: input.amount,
        result: input.amount * rate,
        rate,
        rate_date: snapshot.rate_date,
        source: snapshot.source,
        fetched_at: snapshot.fetched_at,
      }
    },
  }
}

const defaultService = createRateService()
export const getLatest = defaultService.getLatest
export const convert = defaultService.convert

import { fetchLatestRates } from './sources/er-api'
import type { ConversionResult, RateResult, RateSnapshot } from './types'

const CACHE_TTL_MS = 60 * 60 * 1000
type Source = (base: string) => Promise<RateSnapshot>
type Clock = () => Date
type LatestConversionInput = { from: string; to: string; amount: number }

function normalizeBase(base: string): string {
  const normalized = base.trim().toUpperCase()
  if (!normalized) throw new Error('Base currency is required')
  return normalized
}

export function createRateService(source: Source = fetchLatestRates, clock: Clock = () => new Date()) {
  const cache = new Map<string, RateSnapshot>()

  async function getLatest(base: string): Promise<RateResult> {
    const key = normalizeBase(base)
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
    /** Latest-only conversion. Historical/date conversion belongs to Task 4. */
    async convert(input: LatestConversionInput): Promise<ConversionResult> {
      const from = normalizeBase(input.from)
      const to = normalizeBase(input.to)
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

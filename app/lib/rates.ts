import { fetchLatestRates, ecbCurrencies } from './sources/ecb'
import { getDatabase } from './db'
import type { ConversionResult, RateResult, RateSnapshot } from './types'

const CACHE_TTL_MS = 60 * 60 * 1000
type Source = (base: string) => Promise<RateSnapshot>
type Clock = () => Date
type LatestConversionInput = { from: string; to: string; amount: number; date?: string }
type RateServiceStatus = 'configured' | 'available' | 'degraded' | 'unavailable'
type Database = ReturnType<typeof getDatabase>
export const historicalUnavailableError = (date: string, base: string) => ({ error: 'historical_unavailable', message: 'Historical rate is unavailable', details: { date, base } })

const supportedCurrencies: Set<string> = ecbCurrencies

function normalizeBase(base: string): string {
  const normalized = base.trim().toUpperCase()
  if (!normalized) throw new Error('Base currency is required')
  return normalized
}

export function createRateService(source: Source = fetchLatestRates, clock: Clock = () => new Date(), database: Database = getDatabase()) {
  const cache = new Map<string, RateSnapshot>()
  let status: RateServiceStatus = 'configured'
  let checkedAt: string | null = null
  const cacheStats = { live_fetch: 0, db_read: 0, cache_hit: 0, stale_fallback: 0 }

  function isSupportedCurrency(currency: string): boolean {
    return supportedCurrencies.has(currency.trim().toUpperCase())
  }

  function isFresh(snapshot: RateSnapshot | null | undefined, now: Date): boolean {
    return snapshot != null && now.getTime() - new Date(snapshot.fetched_at).getTime() < CACHE_TTL_MS
  }

  async function getLatest(base: string): Promise<RateResult> {
    const key = normalizeBase(base)
    if (!isSupportedCurrency(key)) throw new Error(`Unsupported currency: ${key}`)
    const now = clock()
    const cached = cache.get(key)
    if (isFresh(cached, now)) {
      cacheStats.cache_hit += 1
      return cached as RateSnapshot
    }

    // Stored rows are only served while fresh; a stale row means the daily
    // job missed a refresh, so the live source rehydrates and upserts here.
    const stored = database ? await database.getLatest(key) : null
    if (isFresh(stored, now)) {
      cacheStats.db_read += 1
      cache.set(key, stored as RateSnapshot)
      return stored as RateSnapshot
    }

    let snapshot: RateSnapshot
    try {
      snapshot = await source(key)
    } catch (error) {
      // Prefer stale-but-usable data over a failed source response.
      const fallback = stored ?? cached
      if (fallback) {
        cacheStats.stale_fallback += 1
        status = 'degraded'
        checkedAt = fallback.fetched_at
        return fallback
      }
      status = 'unavailable'
      throw error
    }
    if (database) await database.upsertRates(Object.entries(snapshot.rates).map(([currency, rate]) => ({
      date: snapshot.rate_date, base: snapshot.base, currency, rate, source: snapshot.source, fetched_at: snapshot.fetched_at,
    })))
    cache.set(key, snapshot)
    cacheStats.live_fetch += 1
    status = 'available'
    checkedAt = snapshot.fetched_at
    return snapshot
  }

  async function getHistorical(date: string, base: string): Promise<RateResult> {
    const key = normalizeBase(base)
    if (!isSupportedCurrency(key)) throw new Error(`Unsupported currency: ${key}`)
    const stored = database ? await database.getHistorical(date, key) : null
    if (stored) return stored
    const cached = cache.get(key)
    if (cached && cached.rate_date === date) return cached
    throw historicalUnavailableError(date, key)
  }

  return {
    getLatest,
    getHistorical,
    isSupportedCurrency,
    getStatus: () => ({ status, checked_at: checkedAt }),
    getCacheStats: () => ({ ...cacheStats }),
    /** Converts at the latest rate, or at `input.date` when a historical date is given. */
    async convert(input: LatestConversionInput): Promise<ConversionResult> {
      const from = normalizeBase(input.from)
      const to = normalizeBase(input.to)
      const snapshot = input.date ? await getHistorical(input.date, from) : await getLatest(from)
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
export const getHistorical = defaultService.getHistorical
export const convert = defaultService.convert
export const isSupportedCurrency = defaultService.isSupportedCurrency
export const getRateServiceStatus = defaultService.getStatus
export const getCacheStats = defaultService.getCacheStats

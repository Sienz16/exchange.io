import { fetchLatestRates } from './sources/er-api'
import { getDatabase } from './db'
import type { ConversionResult, RateResult, RateSnapshot } from './types'

const CACHE_TTL_MS = 60 * 60 * 1000
type Source = (base: string) => Promise<RateSnapshot>
type Clock = () => Date
type LatestConversionInput = { from: string; to: string; amount: number; date?: string }
type RateServiceStatus = 'configured' | 'available' | 'degraded' | 'unavailable'
type Database = ReturnType<typeof getDatabase>
export const historicalUnavailableError = (date: string, base: string) => ({ error: 'historical_unavailable', message: 'Historical rate is unavailable', details: { date, base } })

const supportedCurrencies = new Set('AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CAD CDF CHF CLF CLP CNH CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP FOK GBP GEL GGP GHS GIP GMD GNF GTQ GYD HKD HNL HRK HTG HUF IDR ILS IMP INR IQD IRR ISK JEP JMD JOD JPY KES KGS KHR KID KMF KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SYP SZL THB TJS TMT TND TOP TRY TTD TVD TWD TZS UAH UGX USD UYU UZS VES VND VUV WST XAF XCD XCG XDR XOF XPF YER ZAR ZMW ZWG ZWL'.split(' '))

function normalizeBase(base: string): string {
  const normalized = base.trim().toUpperCase()
  if (!normalized) throw new Error('Base currency is required')
  return normalized
}

export function createRateService(source: Source = fetchLatestRates, clock: Clock = () => new Date(), database: Database = getDatabase()) {
  const cache = new Map<string, RateSnapshot>()
  let status: RateServiceStatus = 'configured'
  let checkedAt: string | null = null

  function isSupportedCurrency(currency: string): boolean {
    return supportedCurrencies.has(currency.trim().toUpperCase())
  }

  async function getLatest(base: string): Promise<RateResult> {
    const key = normalizeBase(base)
    if (!isSupportedCurrency(key)) throw new Error(`Unsupported currency: ${key}`)
    if (database) {
      const stored = await database.getLatest(key)
      if (stored) {
        cache.set(key, stored)
        return stored
      }
    }
    const cached = cache.get(key)
    const now = clock()
    if (cached && now.getTime() - new Date(cached.fetched_at).getTime() < CACHE_TTL_MS) return cached

    let snapshot: RateSnapshot
    try {
      snapshot = await source(key)
    } catch (error) {
      if (cached) {
        status = 'degraded'
        checkedAt = cached.fetched_at
        return cached
      }
      status = 'unavailable'
      throw error
    }
    if (database) await database.upsertRates(Object.entries(snapshot.rates).map(([currency, rate]) => ({
      date: snapshot.rate_date, base: snapshot.base, currency, rate, source: snapshot.source, fetched_at: snapshot.fetched_at,
    })))
    cache.set(key, snapshot)
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
    /** Latest-only conversion. Historical/date conversion belongs to Task 4. */
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

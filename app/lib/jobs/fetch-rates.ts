import { getDatabase, type RateDatabase, type RateRow } from '../db'
import { readEnv } from '../env'
import { fetchLatestRates } from '../sources/er-api'
import type { RateSnapshot } from '../types'

type Source = (base: string) => Promise<RateSnapshot>
type DailyFetchOptions = { source?: Source; database?: RateDatabase | null; base?: string; clock?: () => Date }
export type DailyFetchResult = { status: 'success'; rows: number; fetched_at: string } | { status: 'error'; error: string; fetched_at: string }

const DEFAULT_SOURCE = 'open.er-api.com'

export function createDailyRateFetcher(options: DailyFetchOptions = {}) {
  const source = options.source ?? fetchLatestRates
  const database = options.database === undefined ? getDatabase() : options.database
  const base = (options.base ?? readEnv('DAILY_RATE_BASE') ?? 'USD').trim().toUpperCase()
  const clock = options.clock ?? (() => new Date())

  return async function run(): Promise<DailyFetchResult> {
    const fetchedAt = clock().toISOString()
    try {
      const snapshot = await source(base)
      const rows: RateRow[] = Object.entries(snapshot.rates).map(([currency, rate]) => ({
        date: snapshot.rate_date, base: snapshot.base, currency, rate, source: snapshot.source, fetched_at: snapshot.fetched_at,
      }))
      if (database) {
        await database.upsertRates(rows)
        await database.recordRateUpdate({ fetched_at: snapshot.fetched_at, source: snapshot.source, status: 'success', error_text: null })
      }
      return { status: 'success', rows: rows.length, fetched_at: snapshot.fetched_at }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (database) {
        await database.recordRateUpdate({ fetched_at: fetchedAt, source: DEFAULT_SOURCE, status: 'error', error_text: message })
      }
      return { status: 'error', error: message, fetched_at: fetchedAt }
    }
  }
}

export const runDailyRateFetch = createDailyRateFetcher()

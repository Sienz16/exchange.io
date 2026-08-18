import postgres from 'postgres'
import { readEnv } from './env'
import type { RateSnapshot } from './types'

export type RateRow = { date: string; base: string; currency: string; rate: number; source: string; fetched_at: string }
export type PairRateRow = { date: string; rate: number }
export type TimeSeriesRow = { date: string; rates: Record<string, number>; source: string; fetched_at: string }
export type RateDatabase = {
  getLatest(base: string): Promise<RateSnapshot | null>
  getHistorical(date: string, base: string): Promise<RateSnapshot | null>
  getPairHistory?(from: string, to: string): Promise<PairRateRow[]>
  upsertRates(rows: RateRow[]): Promise<void>
  recordRateUpdate(update: RateUpdate): Promise<void>
}

export type RateUpdate = { fetched_at: string; source: string; status: 'success' | 'error'; error_text: string | null }

export type Sql = ReturnType<typeof postgres>

function snapshot(rows: RateRow[]): RateSnapshot | null {
  if (!rows.length) return null
  const first = rows[0]
  return {
    base: first.base,
    rates: Object.fromEntries(rows.map((row) => [row.currency, Number(row.rate)])),
    rate_date: first.date,
    source: first.source,
    fetched_at: first.fetched_at,
  }
}

export function deriveFromEur(eur: RateSnapshot, base: string): RateSnapshot | null {
  const eurToBase = eur.rates[base]
  if (eurToBase === undefined || !Number.isFinite(eurToBase) || eurToBase <= 0) return null
  const rates: Record<string, number> = { [base]: 1, EUR: 1 / eurToBase }
  for (const [currency, rate] of Object.entries(eur.rates)) {
    if (currency === base || currency === 'EUR') continue
    rates[currency] = rate / eurToBase
  }
  return { base, rates, rate_date: eur.rate_date, source: eur.source, fetched_at: eur.fetched_at }
}

export function createRateDatabase(sql: Sql): RateDatabase {
  async function findBaseRows(base: string, date?: string): Promise<RateSnapshot | null> {
    const rows = date
      ? await sql`SELECT date::text, base, currency, rate::float8, source, to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at FROM daily_rates WHERE base = ${base} AND date = (SELECT max(date) FROM daily_rates WHERE base = ${base} AND date <= ${date}) ORDER BY currency`
      : await sql`SELECT date::text, base, currency, rate::float8, source, to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at FROM daily_rates WHERE base = ${base} AND date = (SELECT max(date) FROM daily_rates WHERE base = ${base}) ORDER BY currency`
    return snapshot(rows as unknown as RateRow[])
  }

  // Exact base rows win; for a dated lookup with no exact rows, derive any base
  // from EUR reference rows (cross-rate math). Latest lookups do not derive —
  // the live source derives from the fresh ECB EUR reference instead.
  async function find(base: string, date?: string): Promise<RateSnapshot | null> {
    const exact = await findBaseRows(base, date)
    if (exact) return exact
    if (!date || base === 'EUR') return null
    const eur = await findBaseRows('EUR', date)
    return eur ? deriveFromEur(eur, base) : null
  }

  return {
    getLatest: (base) => find(base),
    getHistorical: (date, base) => find(base, date),
    async getPairHistory(from, to) {
      if (from === 'EUR') {
        const rows = await sql`SELECT date::text, rate::float8 FROM daily_rates WHERE base = 'EUR' AND currency = ${to} ORDER BY date DESC LIMIT 5000`
        return rows as unknown as PairRateRow[]
      }
       const exact = await sql`SELECT date::text, rate::float8 FROM daily_rates WHERE base = ${from} AND currency = ${to} ORDER BY date DESC LIMIT 5000`
      // Always derive the EUR-based series too, then merge: exact rows win on
      // duplicate dates (fresher source), derived rows fill the history gap.
       const eur = await sql`SELECT date::text, currency, rate::float8 FROM daily_rates WHERE base = 'EUR' AND currency IN (${from}, ${to}) ORDER BY date DESC LIMIT 10000`
      const byDate = new Map<string, number>()
      const byDateExact = new Map<string, number>()
      for (const row of exact as unknown as Array<{ date: string; rate: number }>) byDateExact.set(row.date, row.rate)
      const bySource = new Map<string, { fromRate?: number; toRate?: number }>()
      for (const row of eur as unknown as Array<{ date: string; currency: string; rate: number }>) {
        const entry = bySource.get(row.date) ?? {}
        if (row.currency === from) entry.fromRate = row.rate
        if (row.currency === to) entry.toRate = row.rate
        bySource.set(row.date, entry)
      }
      for (const [date, entry] of bySource) {
        // ECB reference rows never list EUR against itself; it is implicitly 1.
        const fromRate = entry.fromRate ?? (from === 'EUR' ? 1 : undefined)
        const toRate = entry.toRate ?? (to === 'EUR' ? 1 : undefined)
        if (fromRate !== undefined && toRate !== undefined) byDate.set(date, toRate / fromRate)
      }
      for (const [date, rate] of byDateExact) byDate.set(date, rate)
      return Array.from(byDate.entries())
        .map(([date, rate]) => ({ date, rate }))
        .sort((a, b) => a.date.localeCompare(b.date))
    },
    async upsertRates(rows) {
      if (!rows.length) return
      await sql.begin(async (transaction) => {
        for (let index = 0; index < rows.length; index += 500) {
          const chunk = rows.slice(index, index + 500)
          await transaction`INSERT INTO daily_rates (date, base, currency, rate, source, fetched_at) VALUES ${transaction(chunk.map((row) => [row.date, row.base, row.currency, row.rate, row.source, row.fetched_at]))} ON CONFLICT (date, base, currency) DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source, fetched_at = EXCLUDED.fetched_at`
        }
      })
    },
    async recordRateUpdate(update) {
      await sql`INSERT INTO rate_updates (fetched_at, source, status, error_text) VALUES (${update.fetched_at}, ${update.source}, ${update.status}, ${update.error_text})`
    },
  }
}

export async function getTimeSeries(start: string, end: string, base: string, symbols?: string[]): Promise<TimeSeriesRow[]> {
  const instance = getSql()
  if (!instance) return []
  const requested = symbols?.length ? [...new Set([base, ...symbols])] : null
  const rows = await instance`SELECT date::text, currency, rate::float8, source, to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at FROM daily_rates WHERE base = 'EUR' AND date BETWEEN ${start} AND ${end} AND (${requested ? instance`currency IN ${instance(requested)}` : instance`TRUE`}) ORDER BY date ASC, currency ASC`
  const grouped = new Map<string, TimeSeriesRow>()
  for (const row of rows as unknown as Array<{ date: string; currency: string; rate: number; source: string; fetched_at: string }>) {
    const point = grouped.get(row.date) ?? { date: row.date, rates: {}, source: row.source, fetched_at: row.fetched_at }
    point.rates[row.currency] = row.rate
    grouped.set(row.date, point)
  }
  if (base === 'EUR') for (const point of grouped.values()) point.rates.EUR = 1
  if (base !== 'EUR') {
    for (const point of grouped.values()) {
      const baseRate = point.rates[base]
      if (!baseRate) continue
      const rates = { [base]: 1, ...Object.fromEntries(Object.entries(point.rates).filter(([currency]) => !symbols?.length || symbols.includes(currency)).map(([currency, rate]) => [currency, rate / baseRate])) }
      point.rates = rates
    }
  }
  return [...grouped.values()]
}

export async function getCoverage(): Promise<{ earliest_date: string | null; latest_date: string | null; sources: string[]; refresh: string }> {
  const instance = getSql()
  if (!instance) return { earliest_date: null, latest_date: null, sources: [], refresh: 'daily at 00:30 UTC' }
  const rows = await instance`SELECT min(date)::text AS earliest_date, max(date)::text AS latest_date, array_agg(DISTINCT source ORDER BY source) AS sources FROM daily_rates`
  const row = rows[0] as unknown as { earliest_date: string | null; latest_date: string | null; sources: string[] }
  return { earliest_date: row?.earliest_date ?? null, latest_date: row?.latest_date ?? null, sources: row?.sources ?? [], refresh: 'daily at 00:30 UTC' }
}

let sql: Sql | null | undefined
export function getSql(): Sql | null {
  if (sql !== undefined) return sql
  const url = readEnv('DATABASE_URL')
  sql = url ? postgres(url, { max: 5, connect_timeout: 5, idle_timeout: 20 }) : null
  return sql
}

let database: RateDatabase | null | undefined
export function getDatabase(): RateDatabase | null {
  if (database !== undefined) return database
  const instance = getSql()
  database = instance ? createRateDatabase(instance) : null
  return database
}

let databaseHealth: { checkedAt: number; healthy: boolean } | null = null
let freshness: { checkedAt: number; fetchedAt: string | null } | null = null
export async function checkDatabase(): Promise<boolean> {
  const now = Date.now()
  if (databaseHealth && now - databaseHealth.checkedAt < 10_000) return databaseHealth.healthy
  const instance = getSql()
  if (!instance) return true
  try {
    await Promise.race([
      instance`SELECT 1`,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('database health probe timed out')), 3_000)),
    ])
    databaseHealth = { checkedAt: now, healthy: true }
    return true
  } catch (error) {
    console.error('database health probe failed:', error)
    databaseHealth = { checkedAt: now, healthy: false }
    return false
  }
}

export async function getLatestFetchedAt(): Promise<string | null> {
  const now = Date.now()
  if (freshness && now - freshness.checkedAt < 10_000) return freshness.fetchedAt
  const instance = getSql()
  if (!instance) return null
  try {
    const rows = await Promise.race([
      instance`SELECT max(fetched_at) AS fetched_at FROM daily_rates`,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('database freshness probe timed out')), 3_000)),
    ])
    const fetchedAt = (rows[0] as { fetched_at?: string | null } | undefined)?.fetched_at ?? null
    freshness = { checkedAt: now, fetchedAt }
    return fetchedAt
  } catch (error) {
    console.error('database freshness probe failed:', error)
    freshness = { checkedAt: now, fetchedAt: null }
    return null
  }
}

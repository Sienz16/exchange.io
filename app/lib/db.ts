import postgres from 'postgres'
import type { RateSnapshot } from './types'

export type RateRow = { date: string; base: string; currency: string; rate: number; source: string; fetched_at: string }
export type PairRateRow = { date: string; rate: number }
export type RateDatabase = {
  getLatest(base: string): Promise<RateSnapshot | null>
  getHistorical(date: string, base: string): Promise<RateSnapshot | null>
  getPairHistory?(from: string, to: string): Promise<PairRateRow[]>
  upsertRates(rows: RateRow[]): Promise<void>
  recordRateUpdate(update: RateUpdate): Promise<void>
}

export type RateUpdate = { fetched_at: string; source: string; status: 'success' | 'error'; error_text: string | null }

type Sql = ReturnType<typeof postgres>

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

export function createRateDatabase(sql: Sql): RateDatabase {
  async function find(base: string, date?: string): Promise<RateSnapshot | null> {
    const rows = date
      ? await sql`SELECT date::text, base, currency, rate::float8, source, fetched_at::text FROM daily_rates WHERE base = ${base} AND date = (SELECT max(date) FROM daily_rates WHERE base = ${base} AND date <= ${date})`
      : await sql`SELECT date::text, base, currency, rate::float8, source, fetched_at::text FROM daily_rates WHERE base = ${base} AND date = (SELECT max(date) FROM daily_rates WHERE base = ${base})`
    return snapshot(rows as unknown as RateRow[])
  }

  return {
    getLatest: (base) => find(base),
    getHistorical: (date, base) => find(base, date),
    async getPairHistory(from, to) {
      const rows = await sql`SELECT date::text, rate::float8 FROM daily_rates WHERE base = ${from} AND currency = ${to} ORDER BY date ASC`
      return rows as unknown as PairRateRow[]
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

let database: RateDatabase | null | undefined
export function getDatabase(): RateDatabase | null {
  if (database !== undefined) return database
  const url = typeof process !== 'undefined' ? process.env.DATABASE_URL : undefined
  database = url ? createRateDatabase(postgres(url, { max: 1 })) : null
  return database
}

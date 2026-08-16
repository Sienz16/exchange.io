import postgres from 'postgres'
import type { RateSnapshot } from './types'

export type RateRow = { date: string; base: string; currency: string; rate: number; source: string; fetched_at: string }
export type RateDatabase = {
  getLatest(base: string): Promise<RateSnapshot | null>
  getHistorical(date: string, base: string): Promise<RateSnapshot | null>
  upsertRates(rows: RateRow[]): Promise<void>
}

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
  async function find(query: string, base: string, date?: string): Promise<RateSnapshot | null> {
    const rows = date
      ? await sql`SELECT date::text, base, currency, rate::float8, source, fetched_at::text FROM daily_rates WHERE base = ${base} AND date <= ${date} ORDER BY date DESC`
      : await sql`SELECT date::text, base, currency, rate::float8, source, fetched_at::text FROM daily_rates WHERE base = ${base} AND date = (SELECT max(date) FROM daily_rates WHERE base = ${base})`
    const actualDate = rows[0]?.date
    return snapshot(rows.filter((row) => row.date === actualDate) as RateRow[])
  }

  return {
    getLatest: (base) => find('latest', base),
    getHistorical: (date, base) => find('historical', base, date),
    async upsertRates(rows) {
      if (!rows.length) return
      await sql.begin(async (transaction) => {
        for (const row of rows) {
          await transaction`INSERT INTO daily_rates (date, base, currency, rate, source, fetched_at) VALUES (${row.date}, ${row.base}, ${row.currency}, ${row.rate}, ${row.source}, ${row.fetched_at}) ON CONFLICT (date, base, currency) DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source, fetched_at = EXCLUDED.fetched_at`
        }
      })
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

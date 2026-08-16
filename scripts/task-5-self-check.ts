import assert from 'node:assert/strict'
import { createDailyRateFetcher, runDailyRateFetch } from '../app/lib/jobs/fetch-rates'

const snapshot = { base: 'USD', rates: { USD: 1, EUR: 0.9 }, rate_date: '2026-08-16', source: 'test', fetched_at: '2026-08-16T00:00:00Z' }
const updates: unknown[] = []
const rows: unknown[] = []
const database = {
  getLatest: async () => null,
  getHistorical: async () => null,
  upsertRates: async (value: unknown[]) => { rows.push(value) },
  recordRateUpdate: async (value: unknown) => { updates.push(value) },
}

const result = await createDailyRateFetcher({ source: async () => snapshot, database, base: 'USD' })()
assert.equal(result.status, 'success')
assert.equal(rows.length, 1)
assert.deepEqual(updates, [{ source: 'test', status: 'success', fetched_at: '2026-08-16T00:00:00Z', error_text: null }])

const failedUpdates: unknown[] = []
const failed = createDailyRateFetcher({
  source: async () => { throw new Error('source down') },
  database: { ...database, recordRateUpdate: async (value: unknown) => { failedUpdates.push(value) } },
  base: 'USD',
})
const failure = await failed()
assert.equal(failure.status, 'error')
assert.match(failure.error, /source down/)
assert.deepEqual(failedUpdates, [{ source: 'open.er-api.com', status: 'error', fetched_at: failure.fetched_at, error_text: 'source down' }])

console.log('task 5 self-check passed')

import { strict as assert } from 'node:assert'
import {
  convertQuerySchema,
  forecastQuerySchema,
  historicalQuerySchema,
  isFutureDate,
  parseQuery,
} from '../app/lib/validation'
import { createRateService } from '../app/lib/rates'
import { fetchLatestRates, parseEcbXml } from '../app/lib/sources/ecb'
import { withFallback } from '../app/lib/sources/fallback'
import type { RateSnapshot } from '../app/lib/types'

const query = parseQuery(convertQuerySchema, {
  from: 'USD',
  to: 'EUR',
  amount: '100',
})
assert.deepEqual(query, { from: 'USD', to: 'EUR', amount: 100 })

assert.throws(
  () => parseQuery(convertQuerySchema, { from: 'usd', to: 'EUR', amount: '100' }),
  (error: unknown) => {
    assert.deepEqual(Object.keys(error as object).sort(), ['details', 'error', 'message'])
    assert.equal((error as { error: string }).error, 'invalid_query')
    return true
  },
)

assert.equal(isFutureDate('2099-01-01', new Date('2026-08-16T12:00:00Z')), true)
assert.equal(isFutureDate('2026-08-16', new Date('2026-08-16T12:00:00Z')), false)

assert.throws(() => parseQuery(convertQuerySchema, { from: 'USD', to: 'EUR', amount: 0 }))
assert.throws(() => parseQuery(convertQuerySchema, { from: 'USD', to: 'EUR', amount: 1e12 + 1 }))
assert.throws(() => parseQuery(convertQuerySchema, { from: 'USD', to: 'EUR', amount: true }))
assert.throws(() => parseQuery(forecastQuerySchema, { from: 'USD', to: 'EUR', horizon: 31 }))
assert.throws(() => parseQuery(forecastQuerySchema, { from: 'USD', to: 'EUR', horizon: true }))
assert.throws(() => parseQuery(historicalQuerySchema, { date: '2026-02-30', base: 'USD' }))

const snapshots: Record<string, RateSnapshot> = {
  USD: {
    base: 'USD',
    rates: { USD: 1, EUR: 0.8, JPY: 160 },
    rate_date: '2026-08-16',
    source: 'self-check',
    fetched_at: '2026-08-16T00:00:00.000Z',
  },
}
let fetches = 0
const rates = createRateService(async (base) => {
  fetches += 1
  const snapshot = snapshots[base]
  if (!snapshot) throw new Error('source unavailable')
  return snapshot
}, () => new Date('2026-08-16T00:30:00.000Z'), null)

const converted = await rates.convert({ from: 'USD', to: 'EUR', amount: 10 })
assert.equal(converted.result, 8)
assert.equal(converted.rate, 0.8)
assert.equal(converted.rate_date, '2026-08-16')
assert.equal(converted.source, 'self-check')
assert.equal(fetches, 1)

const sameCurrency = await rates.convert({ from: 'USD', to: 'USD', amount: 10 })
assert.equal(sameCurrency.result, 10)
assert.equal(sameCurrency.rate, 1)
assert.equal(fetches, 1)

const stale = createRateService(async () => {
  throw new Error('refresh failed')
}, () => new Date('2026-08-16T02:01:00.000Z'), null)
await assert.rejects(() => stale.getLatest('USD'))
let staleNow = new Date('2026-08-16T00:00:00.000Z')
let failRefresh = false
const staleSource = createRateService(async () => {
  if (failRefresh) throw new Error('refresh failed')
  return snapshots.USD
}, () => staleNow, null)
const fresh = await staleSource.getLatest('USD')
staleNow = new Date('2026-08-16T01:01:00.000Z')
failRefresh = true
assert.deepEqual(await staleSource.getLatest('USD'), fresh)

let replacementFetches = 0
let replacementNow = new Date('2026-08-16T00:00:00.000Z')
const replacementSnapshots = [
  { ...snapshots.USD, fetched_at: '2026-08-16T00:00:00.000Z' },
  { ...snapshots.USD, rates: { USD: 1, EUR: 0.9, JPY: 160 }, fetched_at: '2026-08-16T01:00:00.000Z' },
]
const replacementService = createRateService(async () => replacementSnapshots[replacementFetches++], () => replacementNow, null)
await replacementService.getLatest(' usd ')
replacementNow = new Date('2026-08-16T00:59:59.999Z')
assert.equal((await replacementService.getLatest('USD')).rates.EUR, 0.8)
replacementNow = new Date('2026-08-16T01:00:00Z')
assert.equal((await replacementService.getLatest('USD')).rates.EUR, 0.9)
assert.equal(replacementFetches, 2)

// Database-backed freshness: stored rows are served while fresh, refreshed
// from the source once stale, and still served (degraded) if the source fails.
class FakeDatabase {
  stored = new Map<string, RateSnapshot>()
  upsertCount = 0
  async getLatest(base: string) { return this.stored.get(base) ?? null }
  async getHistorical(date: string, base: string) {
    const snapshot = this.stored.get(base)
    return snapshot && snapshot.rate_date === date ? snapshot : null
  }
  async upsertRates(rows: Array<{ date: string; base: string; currency: string; rate: number; source: string; fetched_at: string }>) {
    this.upsertCount += 1
    for (const row of rows) {
      const snapshot = this.stored.get(row.base) ??
        { base: row.base, rates: {}, rate_date: row.date, source: row.source, fetched_at: row.fetched_at }
      snapshot.rates[row.currency] = row.rate
      this.stored.set(row.base, snapshot)
    }
  }
  async recordRateUpdate() {}
}
let dbNow = new Date('2026-08-16T00:00:00Z')
let dbFetches = 0
let dbSourceDown = false
const fakeDb = new FakeDatabase()
const dbService = createRateService(async () => {
  dbFetches += 1
  if (dbSourceDown) throw new Error('refresh failed')
  return { ...snapshots.USD, rates: { USD: 1, EUR: 0.5 + dbFetches * 0.25, JPY: 160 }, fetched_at: dbNow.toISOString() }
}, () => dbNow, fakeDb)

await dbService.getLatest('USD') // first call fetches and stores EUR 0.8
dbNow = new Date('2026-08-16T00:30:00Z')
assert.equal((await dbService.getLatest('USD')).rates.EUR, 0.75)
assert.equal(dbFetches, 1) // fresh stored row: no source call

dbNow = new Date('2026-08-16T02:00:00Z')
assert.equal((await dbService.getLatest('USD')).rates.EUR, 1)
assert.equal(dbFetches, 2) // stale stored row: refreshed and upserted
assert.equal(fakeDb.upsertCount, 0) // non-EUR derived snapshots are not persisted

dbNow = new Date('2026-08-16T04:00:00Z')
dbSourceDown = true
assert.equal((await dbService.getLatest('USD')).rates.EUR, 1) // source down: stale-but-usable data wins
assert.equal(dbService.getStatus().status, 'degraded')
assert.equal(dbFetches, 3)

const xmlResponse = (body: string, ok = true, status = 200) => ({
  ok,
  status,
  text: async () => body,
}) as Response
const sampleEcbXml = `<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01" xmlns="http://www.ecb.europa.eu/vocabulary/2002-08-01/eurofxref">
  <gesmes:subject>Reference rates</gesmes:subject>
  <Cube>
    <Cube time='2026-08-14'>
      <Cube currency='USD' rate='1.1'/>
      <Cube currency='JPY' rate='170.5'/>
      <Cube currency='GBP' rate='0.85'/>
    </Cube>
  </Cube>
</gesmes:Envelope>`
const archiveStyleXml = sampleEcbXml.replaceAll("'", '"')
assert.equal(parseEcbXml(archiveStyleXml).length, 3) // the historical archive quotes with double quotes
const runSourceCheck = (fetchImpl: typeof fetch) => fetchLatestRates(' usd ', fetchImpl)

let primaryCalls = 0
const fallbackResult = await withFallback(async () => {
  primaryCalls += 1
  throw new Error('primary down')
}, async () => ({ ...snapshots.USD, source: 'fallback' }))('USD')
assert.equal(primaryCalls, 1)
assert.equal(fallbackResult.source, 'fallback')

const derived = await runSourceCheck(async () => xmlResponse(sampleEcbXml))
assert.equal(derived.base, 'USD')
assert.equal(derived.rate_date, '2026-08-14')
assert.equal(derived.source, 'ecb.europa.eu')
assert.equal(derived.rates.USD, 1)
assert.ok(Math.abs(derived.rates.EUR - 1 / 1.1) < 1e-12)
assert.ok(Math.abs(derived.rates.JPY - 170.5 / 1.1) < 1e-12)

const eurBase = await fetchLatestRates('EUR', async () => xmlResponse(sampleEcbXml))
assert.equal(eurBase.base, 'EUR')
assert.equal(eurBase.rates.USD, 1.1)
assert.equal(eurBase.rates.EUR, 1)

await assert.rejects(() => fetchLatestRates('VND', async () => xmlResponse(sampleEcbXml)), /Unsupported currency/)
await assert.rejects(() => runSourceCheck(async () => xmlResponse('', false, 503)), /HTTP 503/)
await assert.rejects(() => runSourceCheck(async () => xmlResponse('<Envelope/>')), /no rates/)

await assert.rejects(() => fetchLatestRates('USD', async (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
}), 1), /Aborted/)

console.log('self-check passed')

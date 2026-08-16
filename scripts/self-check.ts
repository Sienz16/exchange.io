import { strict as assert } from 'node:assert'
import {
  convertQuerySchema,
  forecastQuerySchema,
  historicalQuerySchema,
  isFutureDate,
  parseQuery,
} from '../app/lib/validation'
import { createRateService } from '../app/lib/rates'
import { fetchLatestRates } from '../app/lib/sources/er-api'
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

for (const query of [
  { from: 'USD', to: 'EUR', amount: 100, date: '2099-01-01' },
  { date: '2099-01-01', base: 'USD' },
]) {
  assert.throws(
    () => parseQuery(query.date ? convertQuerySchema : historicalQuerySchema, query),
    (error: unknown) => {
      assert.deepEqual(Object.keys(error as object).sort(), ['details', 'error', 'message'])
      return true
    },
  )
}

assert.throws(() => parseQuery(convertQuerySchema, { from: 'USD', to: 'EUR', amount: 0 }))
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
}, () => new Date('2026-08-16T00:30:00.000Z'))

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
}, () => new Date('2026-08-16T02:01:00.000Z'))
await assert.rejects(() => stale.getLatest('USD'))
let staleNow = new Date('2026-08-16T00:00:00.000Z')
let failRefresh = false
const staleSource = createRateService(async () => {
  if (failRefresh) throw new Error('refresh failed')
  return snapshots.USD
}, () => staleNow)
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
const replacementService = createRateService(async () => replacementSnapshots[replacementFetches++], () => replacementNow)
await replacementService.getLatest(' usd ')
replacementNow = new Date('2026-08-16T00:59:59.999Z')
assert.equal((await replacementService.getLatest('USD')).rates.EUR, 0.8)
replacementNow = new Date('2026-08-16T01:00:00.000Z')
assert.equal((await replacementService.getLatest('USD')).rates.EUR, 0.9)
assert.equal(replacementFetches, 2)

const sourceResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
}) as Response
const runSourceCheck = (fetchImpl: typeof fetch) => fetchLatestRates(' usd ', fetchImpl)

await assert.rejects(() => runSourceCheck(async () => sourceResponse({}, false, 503)), /HTTP 503/)
await assert.rejects(() => runSourceCheck(async () => sourceResponse({
  result: 'success', base_code: 'USD', time_last_update_utc: 'Sun, 16 Aug 2026 00:00:00 GMT', rates: {},
})), /invalid response/)
await assert.rejects(() => runSourceCheck(async () => sourceResponse({
  result: 'success', base_code: 'USD', time_last_update_utc: 'Sun, 16 Aug 2026 00:00:00 GMT', rates: { USD: Number.NaN },
})), /invalid response/)
Object.defineProperty(Object.prototype, 'USD', { value: 1, configurable: true })
try {
  await assert.rejects(() => runSourceCheck(async () => sourceResponse({
    result: 'success', base_code: 'USD', time_last_update_utc: 'Sun, 16 Aug 2026 00:00:00 GMT', rates: { EUR: 0.8 },
  })), /invalid response/)
} finally {
  Reflect.deleteProperty(Object.prototype, 'USD')
}
await assert.rejects(() => runSourceCheck(async () => sourceResponse({
  result: 'success', base_code: 'USD', time_last_update_utc: 'not a date', rates: { USD: 1 },
})), /invalid update time/)

await assert.rejects(() => fetchLatestRates('USD', async (_input, init) => new Promise((_resolve, reject) => {
  init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
}), 1), /Aborted/)

console.log('self-check passed')

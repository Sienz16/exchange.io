import { strict as assert } from 'node:assert'
import {
  classifyUserAgent,
  clientIp,
  createRequestRecorder,
  dailySalt,
  hashIp,
  pairForRoute,
  refererDomain,
  type AnalyticsWriter,
  type ApiRequestEntry,
} from '../app/lib/analytics'

assert.equal(classifyUserAgent('Mozilla/5.0 (Macintosh) Chrome/126.0'), 'browser')
assert.equal(classifyUserAgent(null), 'browser')
assert.equal(classifyUserAgent('curl/8.4.0'), 'script')
assert.equal(classifyUserAgent('python-requests/2.31.0'), 'script')
assert.equal(classifyUserAgent('Go-http-client/2.0'), 'script')
assert.equal(classifyUserAgent('axios/1.7.2'), 'script')
assert.equal(classifyUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)'), 'bot')
assert.equal(classifyUserAgent('some crawler spider thing'), 'bot')

assert.equal(refererDomain('https://example.com/page?x=1'), 'example.com')
assert.equal(refererDomain(null), null)
assert.equal(refererDomain('not-a-url'), null)

assert.equal(pairForRoute('/api/convert', { from: 'usd', to: 'eur' }), 'USD/EUR')
assert.equal(pairForRoute('/api/forecast', { from: 'USD', to: 'JPY' }), 'USD/JPY')
assert.equal(pairForRoute('/api/convert', { from: 'USD' }), null)
assert.equal(pairForRoute('/api/latest', { base: 'USD' }), null)

assert.equal(clientIp(new Headers({ 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '198.51.100.7, 10.0.0.1' })), '203.0.113.9')
assert.equal(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' })), '10.0.0.1')
assert.equal(clientIp(new Headers()), 'unknown')

const hashA = await hashIp('203.0.113.9', 'salt-one')
assert.match(hashA, /^[0-9a-f]{16}$/)
assert.equal(hashA, await hashIp('203.0.113.9', 'salt-one'))
assert.notEqual(hashA, await hashIp('203.0.113.9', 'salt-two'))

const saltA = dailySalt(new Date('2026-08-17T10:00:00Z'))
const saltB = dailySalt(new Date('2026-08-17T23:00:00Z'))
const saltC = dailySalt(new Date('2026-08-18T00:00:00Z'))
assert.equal(saltA, saltB)
if (saltA === null) assert.equal(saltC, null)
else assert.notEqual(saltA, saltC)

const entry = (route: string): ApiRequestEntry => ({
  ts: new Date().toISOString(),
  route,
  status: 200,
  duration_ms: 12,
  ip_hash: 'a'.repeat(16),
  referer_domain: null,
  ua_class: 'script',
  pair: null,
})

class CollectingWriter implements AnalyticsWriter {
  inserted: ApiRequestEntry[][] = []
  failNext = false
  async insertApiRequests(rows: ApiRequestEntry[]) {
    if (this.failNext) {
      this.failNext = false
      throw new Error('db down')
    }
    this.inserted.push(rows)
  }
}
const writer = new CollectingWriter()
const recorder = createRequestRecorder(writer, { threshold: 3, intervalMs: 60_000 })
recorder.record(entry('/api/latest'))
recorder.record(entry('/api/latest'))
assert.equal(writer.inserted.length, 0) // below threshold: buffered
recorder.record(entry('/api/convert'))
assert.equal(writer.inserted.length, 1) // threshold reached: flushed
assert.equal(writer.inserted[0].length, 3)

await new Promise((resolve) => setTimeout(resolve, 0)) // settle the in-flight flush above
writer.failNext = true
recorder.record(entry('/api/latest'))
recorder.record(entry('/a'))
recorder.record(entry('/b')) // flush throws, batch dropped
assert.equal(writer.inserted.length, 1)
await new Promise((resolve) => setTimeout(resolve, 0)) // let the failed flush settle
recorder.record(entry('/c'))
recorder.record(entry('/d'))
recorder.record(entry('/e')) // next batch lands
assert.equal(writer.inserted.length, 2)
await recorder.flushAll() // empty buffer: no-op

const nullRecorder = createRequestRecorder(null)
nullRecorder.record(entry('/api/latest')) // no-op, must not throw
await nullRecorder.flushAll()

import { clearSessionCookie, constantTimeEqual, createSessionCookie, verifySessionCookie } from '../app/lib/admin-auth'

assert.equal(constantTimeEqual('abc123', 'abc123'), true)
assert.equal(constantTimeEqual('abc123', 'abc124'), false)
assert.equal(constantTimeEqual('abc', 'abcd'), false)

const token = 'test-admin-token-0123456789'
const cookie = await createSessionCookie(token, Date.parse('2026-08-17T12:00:00Z'))
assert.match(cookie, /^admin_session=\d+\.[0-9a-f]{64}; Path=\/; Max-Age=43200; HttpOnly; SameSite=Lax/)
assert.equal(await verifySessionCookie(cookie, token, Date.parse('2026-08-17T20:00:00Z')), true)
assert.equal(await verifySessionCookie(cookie, 'wrong-token-000000000000', Date.parse('2026-08-17T20:00:00Z')), false)
assert.equal(await verifySessionCookie(cookie, token, Date.parse('2026-08-19T00:00:00Z')), false) // expired (>12h)
const tampered = `admin_session=1.${cookie.split('.')[1]}`
assert.equal(await verifySessionCookie(tampered, token, Date.parse('2026-08-17T20:00:00Z')), false) // tampered expiry
assert.equal(await verifySessionCookie('garbage', token), false)
assert.equal(await verifySessionCookie(null, token), false)
assert.match(clearSessionCookie(), /^admin_session=; Path=\/; Max-Age=0; HttpOnly; SameSite=Lax/)

import { createRateService } from '../app/lib/rates'
import type { RateSnapshot } from '../app/lib/types'

const counterSnapshot: RateSnapshot = { base: 'EUR', rates: { EUR: 1, USD: 1.25 }, rate_date: '2026-08-16', source: 'self-check', fetched_at: '2026-08-16T00:00:00.000Z' }
class CounterDatabase {
  stored: RateSnapshot | null = null
  async getLatest() { return this.stored }
  async getHistorical() { return null }
  async upsertRates(rows: Array<{ date: string; base: string; currency: string; rate: number; source: string; fetched_at: string }>) {
    if (!rows.length) return
    const first = rows[0]
    this.stored = {
      base: first.base,
      rates: Object.fromEntries(rows.map((row) => [row.currency, row.rate])),
      rate_date: first.date,
      source: first.source,
      fetched_at: first.fetched_at,
    }
  }
  async recordRateUpdate() {}
}
let counterClock = new Date('2026-08-16T00:00:00Z')
const counterDb = new CounterDatabase()
const counted = createRateService(async () => ({ ...counterSnapshot, fetched_at: counterClock.toISOString() }), () => counterClock, counterDb)

await counted.getLatest('EUR')
assert.equal(counted.getCacheStats().live_fetch, 1)
counterClock = new Date('2026-08-16T00:05:00Z')
await counted.getLatest('EUR')
assert.equal(counted.getCacheStats().cache_hit, 1)
counterClock = new Date('2026-08-16T01:05:00Z')
await counted.getLatest('EUR') // everything stale: live refetch
assert.equal(counted.getCacheStats().live_fetch, 2)

const dbOnly = createRateService(async () => { throw new Error('source down') }, () => new Date('2026-08-16T01:10:00Z'), counterDb)
assert.equal((await dbOnly.getLatest('EUR')).rates.USD, 1.25) // stored row (01:05) is fresh
assert.equal(dbOnly.getCacheStats().db_read, 1)

const staleServed = createRateService(async () => { throw new Error('source down') }, () => new Date('2026-08-16T04:00:00Z'), counterDb)
assert.equal((await staleServed.getLatest('EUR')).rates.USD, 1.25) // stale-but-usable wins over a dead source
assert.equal(staleServed.getCacheStats().stale_fallback, 1)

import { getDashboardStats, getPipelineStats, rollupAndPrune, runRollup } from '../app/lib/analytics'

assert.equal(typeof rollupAndPrune, 'function')
assert.equal(typeof getDashboardStats, 'function')
assert.equal(typeof getPipelineStats, 'function')
assert.equal(typeof runRollup, 'function')
// SQL behavior is exercised against the local database by the live smoke test.

console.log('admin self-check passed')

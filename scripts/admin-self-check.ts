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
assert.equal(clientIp(new Headers({ 'x-forwarded-for': '198.51.100.7, 10.0.0.1' })), '198.51.100.7')
assert.equal(clientIp(new Headers()), 'unknown')

const hashA = await hashIp('203.0.113.9', 'salt-one')
assert.match(hashA, /^[0-9a-f]{16}$/)
assert.equal(hashA, await hashIp('203.0.113.9', 'salt-one'))
assert.notEqual(hashA, await hashIp('203.0.113.9', 'salt-two'))

assert.equal(dailySalt(new Date('2026-08-17T10:00:00Z')), dailySalt(new Date('2026-08-17T23:00:00Z')))
assert.notEqual(dailySalt(new Date('2026-08-17T10:00:00Z')), dailySalt(new Date('2026-08-18T00:00:00Z')))

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

console.log('admin self-check passed')

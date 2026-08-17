import { strict as assert } from 'node:assert'
import { createRateLimiter } from '../app/lib/rate-limit'
import { createRateService } from '../app/lib/rates'

const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, clock: () => 10_000 })
assert.equal(limiter.check('client-a').allowed, true)
assert.equal(limiter.check('client-a').allowed, true)
assert.equal(limiter.check('client-a').allowed, false)
assert.equal(limiter.check('client-b').allowed, true)

let sourceCalls = 0
let releaseSource!: () => void
const source = async () => {
  sourceCalls += 1
  await new Promise<void>((resolve) => { releaseSource = resolve })
  return { base: 'USD', rates: { USD: 1, EUR: 0.9 }, rate_date: '2026-08-16', source: 'test', fetched_at: '2026-08-16T00:00:00.000Z' }
}
const service = createRateService(source, () => new Date('2026-08-16T01:00:00.000Z'), null)
const first = service.getLatest('USD')
const second = service.getLatest('USD')
await new Promise((resolve) => setTimeout(resolve, 0))
assert.equal(sourceCalls, 1)
releaseSource()
assert.equal((await first).rates.EUR, 0.9)
assert.equal((await second).rates.EUR, 0.9)

console.log('hardening self-check passed')

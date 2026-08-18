import { test, expect } from 'bun:test'
import { clientIp } from '../app/lib/analytics'
import { createRateLimiter } from '../app/lib/rate-limit'
import { parseQuery, convertQuerySchema } from '../app/lib/validation'

test('security edge cases', () => {
  expect(clientIp(new Headers({ 'x-forwarded-for': 'spoof, proxy, client' }))).toBe('client')
  expect(() => parseQuery(convertQuerySchema, { from: 'USD', to: 'EUR', amount: 1e12 + 1 })).toThrow()
})

test('limiter expires buckets', () => {
  let now = 0
  const limiter = createRateLimiter({ limit: 1, windowMs: 1000, clock: () => now })
  expect(limiter.check('a').allowed).toBe(true)
  expect(limiter.check('a').allowed).toBe(false)
  now = 1001
  expect(limiter.check('a').allowed).toBe(true)
})

import { strict as assert } from 'node:assert'
import {
  convertQuerySchema,
  forecastQuerySchema,
  historicalQuerySchema,
  isFutureDate,
  parseQuery,
} from '../app/lib/validation'

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

console.log('self-check passed')

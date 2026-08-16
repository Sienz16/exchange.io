import assert from 'node:assert/strict'
import { parseEcbXml, parseEcbXmlAt } from '../app/lib/sources/ecb'
import { createRateService, historicalUnavailableError } from '../app/lib/rates'

const rows = parseEcbXmlAt(`
  <Cube><Cube time="2024-01-05">
    <Cube currency="USD" rate="1.0950"/>
    <Cube currency="JPY" rate="159.20"/>
  </Cube></Cube>
`, 'ecb.europa.eu', '2026-08-16T00:00:00.000Z')
assert.deepEqual(rows.map(({ fetched_at: _fetchedAt, ...row }) => row), [
  { date: '2024-01-05', base: 'EUR', currency: 'USD', rate: 1.095, source: 'ecb.europa.eu' },
  { date: '2024-01-05', base: 'EUR', currency: 'JPY', rate: 159.2, source: 'ecb.europa.eu' },
])
assert.equal(rows[0].fetched_at, '2026-08-16T00:00:00.000Z')
assert.throws(() => parseEcbXml(''), /no rates/i)
assert.throws(() => parseEcbXml('<Cube time="2024-01-05"><Cube currency="USD"/></Cube>'), /no rates/i)

const service = createRateService(
  async () => ({ base: 'USD', rates: { USD: 1, EUR: 0.9 }, rate_date: '2024-01-08', source: 'source', fetched_at: '2024-01-08T00:00:00Z' }),
  () => new Date('2024-01-08T12:00:00Z'),
  {
    getLatest: async () => null,
    getHistorical: async (date, base) => date === '2024-01-08' && base === 'USD' ? {
      base: 'USD', rates: { USD: 1, EUR: 0.91 }, rate_date: '2024-01-05', source: 'db', fetched_at: '2024-01-08T00:00:00Z',
    } : null,
     upsertRates: async () => { throw new Error('db write failed') },
    recordRateUpdate: async () => {},
  },
)
assert.equal((await service.getHistorical('2024-01-08', 'USD')).rate_date, '2024-01-05')
const dated = await service.convert({ from: 'USD', to: 'EUR', amount: 2, date: '2024-01-08' })
assert.equal(dated.result, 1.82)
await assert.rejects(() => service.getLatest('USD'), /db write failed/)

const exactCache = createRateService(
  async () => ({ base: 'USD', rates: { USD: 1, EUR: 0.9 }, rate_date: '2024-01-08', source: 'source', fetched_at: '2024-01-08T00:00:00Z' }),
  () => new Date('2024-01-08T01:00:00Z'),
  null,
)
await exactCache.getLatest('USD')
await assert.rejects(() => exactCache.getHistorical('2024-01-07', 'USD'), (error: unknown) => JSON.stringify(error) === JSON.stringify(historicalUnavailableError('2024-01-07', 'USD')))
assert.deepEqual(historicalUnavailableError('2024-01-07', 'USD'), { error: 'historical_unavailable', message: 'Historical rate is unavailable', details: { date: '2024-01-07', base: 'USD' } })
assert.deepEqual({ error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { currency: 'XXX' } }, { error: 'unsupported_currency', message: 'Currency is not supported by the rate source', details: { currency: 'XXX' } })

console.log('task 4 self-check passed')

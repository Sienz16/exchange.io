import assert from 'node:assert/strict'
import { parseEcbXml } from '../app/lib/sources/ecb'
import { createRateService } from '../app/lib/rates'

const rows = parseEcbXml(`
  <Cube><Cube time="2024-01-05">
    <Cube currency="USD" rate="1.0950"/>
    <Cube currency="JPY" rate="159.20"/>
  </Cube></Cube>
`)
assert.deepEqual(rows.map(({ fetched_at: _fetchedAt, ...row }) => row), [
  { date: '2024-01-05', base: 'EUR', currency: 'USD', rate: 1.095, source: 'ecb.europa.eu' },
  { date: '2024-01-05', base: 'EUR', currency: 'JPY', rate: 159.2, source: 'ecb.europa.eu' },
])

const service = createRateService(
  async () => { throw new Error('source offline') },
  () => new Date('2024-01-08T12:00:00Z'),
  {
    getLatest: async () => null,
    getHistorical: async (date, base) => date === '2024-01-08' && base === 'USD' ? {
      base: 'USD', rates: { USD: 1, EUR: 0.91 }, rate_date: '2024-01-05', source: 'db', fetched_at: '2024-01-08T00:00:00Z',
    } : null,
    upsertRates: async () => undefined,
  },
)
assert.equal((await service.getHistorical('2024-01-08', 'USD')).rate_date, '2024-01-05')

console.log('task 4 self-check passed')

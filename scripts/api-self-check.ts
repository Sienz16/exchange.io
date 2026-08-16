import { strict as assert } from 'node:assert'
import { spawn } from 'node:child_process'

const port = 5174
const server = spawn('bun', ['run', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
  stdio: 'ignore',
})
const baseUrl = `http://127.0.0.1:${port}`

try {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await fetch(`${baseUrl}/api/health`)
      break
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  const health = await fetch(`${baseUrl}/api/health`)
  assert.equal(health.status, 200)
  assert.equal(health.headers.get('access-control-allow-origin'), '*')
  const healthBody = await health.json() as { status: string; data_source: { status: string; checked_at: string | null } }
  assert.equal(healthBody.status, 'ok')
  assert.equal(healthBody.data_source.status, 'configured')
  assert.equal(healthBody.data_source.checked_at, null)

  const preflight = await fetch(`${baseUrl}/api/latest`, { method: 'OPTIONS' })
  assert.equal(preflight.status, 204)
  assert.equal(preflight.headers.has('access-control-allow-methods'), true)
  assert.equal(preflight.headers.get('access-control-allow-methods')?.includes('GET'), true)

  const latest = await fetch(`${baseUrl}/api/latest?base=USD`)
  assert.equal(latest.status, 200)
  assert.equal(latest.headers.get('access-control-allow-origin'), '*')
  assert.equal((await latest.json() as { base: string }).base, 'USD')

  const latestHealth = await fetch(`${baseUrl}/api/health`)
  const latestHealthBody = await latestHealth.json() as { data_source: { status: string; checked_at: string | null } }
  assert.ok(['configured', 'available'].includes(latestHealthBody.data_source.status))

  const unsupported = await fetch(`${baseUrl}/api/latest?base=ZZZ`)
  assert.equal(unsupported.status, 400)
  assert.deepEqual(await unsupported.json(), {
    error: 'unsupported_currency',
    message: 'Currency is not supported by the rate source',
    details: { currency: 'ZZZ' },
  })

  const dated = await fetch(`${baseUrl}/api/convert?from=USD&to=EUR&amount=100&date=2026-08-15`)
  assert.ok([200, 503].includes(dated.status))
  if (dated.status === 503) assert.equal((await dated.json() as { error: string }).error, 'historical_unavailable')

  const future = await fetch(`${baseUrl}/api/convert?from=USD&to=EUR&amount=100&date=2099-01-01`)
  assert.equal(future.status, 422)
  assert.equal((await future.json() as { error: string }).error, 'future_date')

  const malformedDate = await fetch(`${baseUrl}/api/convert?from=USD&to=EUR&amount=100&date=2026-02-30`)
  assert.equal(malformedDate.status, 400)

  const historicalFuture = await fetch(`${baseUrl}/api/historical?date=2099-01-01&base=USD`)
  assert.equal(historicalFuture.status, 422)
  assert.equal((await historicalFuture.json() as { error: string }).error, 'future_date')

  const malformedHistoricalDate = await fetch(`${baseUrl}/api/historical?date=2026-02-30&base=USD`)
  assert.equal(malformedHistoricalDate.status, 400)

  const currencies = await fetch(`${baseUrl}/api/currencies`)
  assert.equal(currencies.status, 200)
  const currencyBody = await currencies.json() as { currencies: Array<{ code: string; decimals: number }> }
  assert.deepEqual(currencyBody.currencies.find(({ code }) => code === 'JPY'), { code: 'JPY', decimals: 0 })

  console.log('api self-check passed')
} finally {
  server.kill()
}

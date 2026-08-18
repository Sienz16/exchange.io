import assert from 'node:assert/strict'
import { forecastFromHistory } from '../app/lib/forecast'

const history = [
  { date: '2026-01-01', rate: 0.8 },
  { date: '2026-01-02', rate: 0.81 },
  { date: '2026-01-03', rate: 0.82 },
  { date: '2026-01-04', rate: 0.81 },
  { date: '2026-01-05', rate: 0.83 },
  { date: '2026-01-06', rate: 0.84 },
  { date: '2026-01-07', rate: 0.85 },
  { date: '2026-01-08', rate: 0.86 },
]

const forecast = forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 3 }, history)
assert(forecast)
assert.equal(forecast.estimate, 0.8480952380952381)
assert(forecast.lower < forecast.estimate)
assert(forecast.estimate < forecast.upper)
assert.equal(forecast.model_version, 'trend-blend-v3')
assert.equal(forecast.training_date, '2026-01-08')
assert.equal(forecast.horizon, 3)
assert.equal(forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 1 }, history.slice(0, 3))?.model_version, 'seasonal-naive-v3')
assert.equal(forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 1 }, []), null)

console.log('forecast self-check passed')

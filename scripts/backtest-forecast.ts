import assert from 'node:assert/strict'
import { forecastFromHistory, rollingBacktest } from '../app/lib/forecast'

const history = [
  { date: '2026-01-01', rate: 0.80 },
  { date: '2026-01-02', rate: 0.81 },
  { date: '2026-01-03', rate: 0.82 },
  { date: '2026-01-04', rate: 0.81 },
  { date: '2026-01-05', rate: 0.83 },
  { date: '2026-01-06', rate: 0.84 },
  { date: '2026-01-07', rate: 0.85 },
  { date: '2026-01-08', rate: 0.86 },
  { date: '2026-01-09', rate: 0.87 },
]

const forecast = forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 3 }, history)
assert(forecast)
assert.equal(forecast.estimate, 0.8566666666666667)
assert(forecast.lower < forecast.estimate)
assert(forecast.estimate < forecast.upper)
assert.equal(forecast.training_date, '2026-01-09')
assert.equal(forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 1 }, history.slice(0, 3))?.model_version, 'seasonal-naive-v1')
assert.equal(forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 1 }, []), null)
const backtest = rollingBacktest(history)
assert(backtest.points > 0)
assert(backtest.mae !== null && Number.isFinite(backtest.mae))

console.log(`backtest passed: points=${backtest.points} mae=${backtest.mae}`)

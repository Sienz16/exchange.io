import { getDatabase, type PairRateRow } from './db'
import type { ForecastResult } from './types'

const WINDOW = 7
const MODEL_VERSION = 'trend-blend-v3'
const DISCLAIMER = 'Estimate only; not financial advice or a trading signal.'
const HISTORY_LIMIT = 5000
const CACHE_TTL_MS = 5 * 60 * 1000
const historyCache = new Map<string, { expiresAt: number; value: PairRateRow[] }>()

export type ForecastInput = { from: string; to: string; horizon: number }

export function forecastFromHistory(input: ForecastInput, history: PairRateRow[]): ForecastResult | null {
  const usable = history
    .filter((row) => Number.isFinite(row.rate) && row.rate > 0 && /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!usable.length) return null

  const values = usable.map((row) => row.rate)
  const baseline = values.length >= WINDOW
    ? values.slice(-WINDOW).reduce((sum, value) => sum + value, 0) / WINDOW
    : values[values.length - 1]
  const recent = values.slice(-WINDOW)
  const days = recent.length > 1 ? Math.max(1, (Date.parse(usable[usable.length - 1].date) - Date.parse(usable[usable.length - recent.length].date)) / 86_400_000) : 1
  const slopePerDay = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / days : 0
  const estimate = values.length >= WINDOW ? baseline + slopePerDay * ((input.horizon + 1) / 2) : baseline
  const recentErrors = usable.slice(-Math.max(WINDOW, 30))
  const errors = recentErrors.length > 1
    ? recentErrors.slice(1).map((row, index) => row.rate - recentErrors[index].rate)
    : []
  const meanError = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : 0
  const deviation = errors.length
    ? Math.sqrt(errors.reduce((sum, value) => sum + (value - meanError) ** 2, 0) / errors.length)
    : baseline * 0.01
  const margin = Math.max(deviation * Math.sqrt(input.horizon), baseline * 0.005)

  return {
    from: input.from,
    to: input.to,
    estimate,
    lower: Math.max(Number.MIN_VALUE, estimate - margin),
    upper: estimate + margin,
    model_version: values.length >= WINDOW ? MODEL_VERSION : 'seasonal-naive-v3',
    training_date: usable[usable.length - 1].date,
    horizon: input.horizon,
    disclaimer: DISCLAIMER,
  }
}

export async function forecastPair(input: ForecastInput): Promise<ForecastResult> {
  const database = getDatabase()
  const key = `${input.from}:${input.to}`
  const cached = historyCache.get(key)
  const history = cached && cached.expiresAt > Date.now()
    ? cached.value
    : database?.getPairHistory ? await database.getPairHistory(input.from, input.to) : []
  if (!cached || cached.expiresAt <= Date.now()) historyCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value: history.slice(-HISTORY_LIMIT) })
  const forecast = forecastFromHistory(input, history)
  if (!forecast) throw {
    error: 'forecast_unavailable',
    message: 'Forecast requires usable historical pair data',
    details: { from: input.from, to: input.to },
  }
  return forecast
}

export function rollingBacktest(history: PairRateRow[], minimumTraining = 2) {
  const points = history.filter((row) => Number.isFinite(row.rate) && row.rate > 0).sort((a, b) => a.date.localeCompare(b.date))
  const errors: number[] = []
  for (let index = minimumTraining; index < points.length; index += 1) {
    const prediction = forecastFromHistory({ from: 'USD', to: 'EUR', horizon: 1 }, points.slice(0, index))
    if (prediction) errors.push(Math.abs(prediction.estimate - points[index].rate))
  }
  return { points: errors.length, mae: errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : null }
}

import { getDatabase, type PairRateRow } from './db'
import type { ForecastResult } from './types'

const WINDOW = 7
const MODEL_VERSION = 'moving-average-v1'
const DISCLAIMER = 'Estimate only; not financial advice or a trading signal.'

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
  const errors = values.length > 1
    ? values.slice(1).map((value, index) => value - values[index])
    : []
  const meanError = errors.length ? errors.reduce((sum, value) => sum + value, 0) / errors.length : 0
  const deviation = errors.length
    ? Math.sqrt(errors.reduce((sum, value) => sum + (value - meanError) ** 2, 0) / errors.length)
    : baseline * 0.01
  const margin = Math.max(deviation * Math.sqrt(input.horizon), baseline * 0.005)

  return {
    from: input.from,
    to: input.to,
    estimate: baseline,
    lower: Math.max(Number.MIN_VALUE, baseline - margin),
    upper: baseline + margin,
    model_version: values.length >= WINDOW ? MODEL_VERSION : 'seasonal-naive-v1',
    training_date: usable[usable.length - 1].date,
    horizon: input.horizon,
    disclaimer: DISCLAIMER,
  }
}

export async function forecastPair(input: ForecastInput): Promise<ForecastResult> {
  const database = getDatabase()
  const history = database?.getPairHistory ? await database.getPairHistory(input.from, input.to) : []
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

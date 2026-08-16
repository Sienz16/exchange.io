export type CurrencyCode = string

export type RateSnapshot = {
  base: CurrencyCode
  rates: Record<CurrencyCode, number>
  rate_date: string
  source: string
  fetched_at: string
}

export type RateResult = RateSnapshot

export type ConversionResult = {
  from: CurrencyCode
  to: CurrencyCode
  amount: number
  result: number
  rate: number
  rate_date: string
  source: string
  fetched_at: string
}

export type ApiError = {
  error: string
  message: string
  details: unknown
}

export type ForecastMetadata = {
  model_version: string
  training_date: string
  horizon: number
  disclaimer: string
}

export type ForecastResult = ForecastMetadata & {
  from: CurrencyCode
  to: CurrencyCode
  estimate: number
  lower: number
  upper: number
}

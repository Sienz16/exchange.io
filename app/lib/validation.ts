import { z } from 'zod'
import type { ApiError } from './types'

export const currencySchema = z.string().regex(/^[A-Z]{3}$/, 'Currency must be an uppercase 3-letter code')

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD format').refine(
  (value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  },
  'Date must be a valid calendar date',
)

const preprocessNumber = <T extends z.ZodType>(schema: T) => z.preprocess(
  (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
  schema,
)

export const positiveAmountSchema = preprocessNumber(z.number().finite().positive().max(1e12))
export const forecastHorizonSchema = preprocessNumber(z.number().finite().int().min(1).max(30))

export const latestQuerySchema = z.object({
  base: z.preprocess((value) => typeof value === 'string' ? value.trim().toUpperCase() : value, currencySchema).default('USD'),
})

export const convertQuerySchema = z.object({
  from: currencySchema,
  to: currencySchema,
  amount: positiveAmountSchema,
  date: isoDateSchema.optional(),
})

export const historicalQuerySchema = z.object({
  date: isoDateSchema,
  base: z.preprocess((value) => typeof value === 'string' ? value.trim().toUpperCase() : value, currencySchema).default('USD'),
  symbols: z.string().optional(),
})

export const latestQueryWithSymbolsSchema = latestQuerySchema.extend({ symbols: z.string().optional() })
export const timeseriesQuerySchema = z.object({
  start: isoDateSchema,
  end: isoDateSchema,
  base: z.preprocess((value) => typeof value === 'string' ? value.trim().toUpperCase() : value, currencySchema).default('USD'),
  symbols: z.string().optional(),
})
export const fluctuationQuerySchema = z.object({
  start: isoDateSchema,
  end: isoDateSchema,
  base: z.preprocess((value) => typeof value === 'string' ? value.trim().toUpperCase() : value, currencySchema).default('USD'),
})
export const batchConvertQuerySchema = z.object({
  from: currencySchema,
  to: z.string().min(3),
  amount: positiveAmountSchema,
  date: isoDateSchema.optional(),
})

export function parseSymbols(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const symbols = [...new Set(value.split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
  if (!symbols.length || symbols.some((symbol) => !currencySchema.safeParse(symbol).success)) throw { error: 'invalid_query', message: 'Query parameters are invalid', details: [{ path: ['symbols'], message: 'symbols must be comma-separated 3-letter currency codes' }] }
  return symbols
}

export const forecastQuerySchema = z.object({
  from: currencySchema,
  to: currencySchema,
  horizon: forecastHorizonSchema,
})

export function isFutureDate(value: string, today = new Date()): boolean {
  const date = new Date(`${value}T00:00:00Z`)
  const current = new Date(today)
  current.setUTCHours(0, 0, 0, 0)
  return date > current
}

export function parseQuery<T extends z.ZodType>(schema: T, query: unknown): z.infer<T> {
  const result = schema.safeParse(query)
  if (result.success) return result.data

  const error: ApiError = {
    error: 'invalid_query',
    message: 'Query parameters are invalid',
    details: result.error.issues,
  }
  throw error
}

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

export const positiveAmountSchema = z.coerce.number().finite().positive()
export const forecastHorizonSchema = z.coerce.number().int().min(1).max(30)

export const latestQuerySchema = z.object({
  base: currencySchema.default('USD'),
})

export const convertQuerySchema = z.object({
  from: currencySchema,
  to: currencySchema,
  amount: positiveAmountSchema,
  date: isoDateSchema.optional(),
})

export const historicalQuerySchema = z.object({
  date: isoDateSchema,
  base: currencySchema.default('USD'),
})

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

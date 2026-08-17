import { deriveFromEur } from '../db'
import type { RateSnapshot } from '../types'
import { ecbCurrencies } from './ecb'

export const FRANKFURTER_SOURCE = 'frankfurter.app'
const URL = 'https://api.frankfurter.app/latest?from=EUR'

export async function fetchFrankfurterRates(base: string, fetchImpl: typeof fetch = fetch): Promise<RateSnapshot> {
  const target = base.trim().toUpperCase()
  if (!ecbCurrencies.has(target)) throw new Error(`Unsupported currency: ${target}`)
  const response = await fetchImpl(URL)
  if (!response.ok) throw new Error(`Rate source returned HTTP ${response.status}`)
  const body = await response.json() as { date?: string; rates?: Record<string, number> }
  if (!body.date || !body.rates || !Object.keys(body.rates).length) throw new Error('Frankfurter response contains no rates')
  const eur: RateSnapshot = {
    base: 'EUR',
    rates: { EUR: 1, ...body.rates },
    rate_date: body.date,
    source: FRANKFURTER_SOURCE,
    fetched_at: new Date().toISOString(),
  }
  if (target === 'EUR') return eur
  const derived = deriveFromEur(eur, target)
  if (!derived) throw new Error(`Rate source has no rate for ${target}`)
  return derived
}

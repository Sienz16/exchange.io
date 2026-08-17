import { deriveFromEur, type RateRow } from '../db'
import type { RateSnapshot } from '../types'

export function parseEcbXml(xml: string, source = ECB_SOURCE): RateRow[] {
  return parseEcbXmlAt(xml, source, new Date().toISOString())
}

export function parseEcbXmlAt(xml: string, source: string, fetchedAt: string): RateRow[] {
  if (!xml.trim()) throw new Error('ECB XML contains no rates')
  const rows: RateRow[] = []
  // The live daily feed quotes attributes with single quotes, the historical
  // archive with double quotes — match either via backreferences.
  for (const day of xml.matchAll(/<Cube\s+time=(['"])(\d{4}-\d{2}-\d{2})\1[^>]*>([\s\S]*?)<\/Cube>/g)) {
    for (const rate of day[3].matchAll(/<Cube\s+currency=(['"])([A-Z]{3})\1\s+rate=(['"])([0-9.]+)\3\s*\/?\s*>/g)) {
      const value = Number(rate[4])
      if (Number.isFinite(value) && value > 0) rows.push({ date: day[2], base: 'EUR', currency: rate[2], rate: value, source, fetched_at: fetchedAt })
    }
  }
  if (!rows.length) throw new Error('ECB XML contains no rates')
  return rows
}

export const ECB_SOURCE = 'ecb.europa.eu'
const DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml'
const TIMEOUT_MS = 10_000

/** Currencies the ECB publishes euro reference rates for (EUR included; BGN ceased with Bulgaria's 2026 euro adoption). */
export const ecbCurrencies = new Set('AUD BRL CAD CHF CNY CZK DKK EUR GBP HKD HUF IDR ILS INR ISK JPY KRW MXN MYR NOK NZD PHP PLN RON SEK SGD THB TRY USD ZAR'.split(' '))

/** Latest snapshot from the ECB daily feed. Non-EUR bases are derived from the EUR reference. */
export async function fetchLatestRates(base: string, fetchImpl: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): Promise<RateSnapshot> {
  const target = base.trim().toUpperCase()
  if (!ecbCurrencies.has(target)) throw new Error(`Unsupported currency: ${target}`)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(DAILY_URL, { signal: controller.signal })
    if (!response.ok) throw new Error(`Rate source returned HTTP ${response.status}`)
    const rows = parseEcbXmlAt(await response.text(), ECB_SOURCE, new Date().toISOString())
    const first = rows[0]
    const eur: RateSnapshot = {
      base: 'EUR',
      rates: { EUR: 1, ...Object.fromEntries(rows.map((row) => [row.currency, row.rate])) },
      rate_date: first.date,
      source: first.source,
      fetched_at: first.fetched_at,
    }
    if (target === 'EUR') return eur
    const derived = deriveFromEur(eur, target)
    if (!derived) throw new Error(`Rate source has no rate for ${target}`)
    return derived
  } finally {
    clearTimeout(timeout)
  }
}

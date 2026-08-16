import type { RateRow } from '../db'

export function parseEcbXml(xml: string, source = 'ecb.europa.eu'): RateRow[] {
  return parseEcbXmlAt(xml, source, new Date().toISOString())
}

export function parseEcbXmlAt(xml: string, source: string, fetchedAt: string): RateRow[] {
  if (!xml.trim()) throw new Error('ECB XML contains no rates')
  const rows: RateRow[] = []
  for (const day of xml.matchAll(/<Cube\s+time="(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/Cube>/g)) {
    for (const rate of day[2].matchAll(/<Cube\s+currency="([A-Z]{3})"\s+rate="([0-9.]+)"\s*\/?\s*>/g)) {
      const value = Number(rate[2])
      if (Number.isFinite(value) && value > 0) rows.push({ date: day[1], base: 'EUR', currency: rate[1], rate: value, source, fetched_at: fetchedAt })
    }
  }
  if (!rows.length) throw new Error('ECB XML contains no rates')
  return rows
}

import type { RateSnapshot } from '../types'

type Source = (base: string) => Promise<RateSnapshot>

export function withFallback(primary: Source, secondary: Source): Source {
  return async (base) => {
    try {
      const primaryResult = await primary(base)
      void secondary(base).then((secondaryResult) => {
        try { crossValidate(primaryResult, secondaryResult) } catch (error) { console.error('rate source cross-validation failed:', error) }
      }).catch(() => undefined)
      return primaryResult
    } catch (primaryError) {
      try {
        return await secondary(base)
      } catch (secondaryError) {
        throw new Error(`Primary source failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}; fallback failed: ${secondaryError instanceof Error ? secondaryError.message : String(secondaryError)}`)
      }
    }
  }
}

export function crossValidate(primary: RateSnapshot, secondary: RateSnapshot, tolerance = 0.02): void {
  for (const [currency, rate] of Object.entries(primary.rates)) {
    const other = secondary.rates[currency]
    if (other !== undefined && rate > 0 && Math.abs(rate - other) / rate > tolerance) throw new Error(`Rate sources disagree for ${currency}`)
  }
}

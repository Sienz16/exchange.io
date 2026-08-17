import type { RateSnapshot } from '../types'

type Source = (base: string) => Promise<RateSnapshot>

export function withFallback(primary: Source, secondary: Source): Source {
  return async (base) => {
    try {
      return await primary(base)
    } catch (primaryError) {
      try {
        return await secondary(base)
      } catch (secondaryError) {
        throw new Error(`Primary source failed: ${primaryError instanceof Error ? primaryError.message : String(primaryError)}; fallback failed: ${secondaryError instanceof Error ? secondaryError.message : String(secondaryError)}`)
      }
    }
  }
}

type Bucket = { startedAt: number; count: number }
export type SharedRateLimitStore = { check(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> }

export function createRateLimiter(options: { limit: number; windowMs: number; maxKeys?: number; clock?: () => number; store?: SharedRateLimitStore }) {
  const buckets = new Map<string, Bucket>()
  const clock = options.clock ?? Date.now
  const maxKeys = options.maxKeys ?? 10_000

  return {
    check(key: string) {
      const now = clock()
      for (const [bucketKey, bucket] of buckets) {
        if (now - bucket.startedAt >= options.windowMs) buckets.delete(bucketKey)
      }
      const current = buckets.get(key)
      if (!current || now - current.startedAt >= options.windowMs) {
        if (!current && buckets.size >= maxKeys) {
          const oldest = buckets.entries().next().value?.[0]
          if (oldest) buckets.delete(oldest)
        }
        buckets.set(key, { startedAt: now, count: 1 })
        return { allowed: true, remaining: Math.max(options.limit - 1, 0), retryAfter: 0 }
      }
      current.count += 1
      buckets.delete(key)
      buckets.set(key, current)
      const allowed = current.count <= options.limit
      return {
        allowed,
        remaining: Math.max(options.limit - current.count, 0),
        retryAfter: Math.ceil((options.windowMs - (now - current.startedAt)) / 1000),
      }
    },
    async checkShared(key: string) {
      return options.store ? options.store.check(key, options.limit, options.windowMs) : this.check(key)
    },
  }
}

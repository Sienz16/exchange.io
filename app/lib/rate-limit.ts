type Bucket = { startedAt: number; count: number }

export function createRateLimiter(options: { limit: number; windowMs: number; maxKeys?: number; clock?: () => number }) {
  const buckets = new Map<string, Bucket>()
  const clock = options.clock ?? Date.now
  const maxKeys = options.maxKeys ?? 10_000

  return {
    check(key: string) {
      const now = clock()
      const current = buckets.get(key)
      if (!current || now - current.startedAt >= options.windowMs) {
        if (!current && buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value
          if (oldest) buckets.delete(oldest)
        }
        buckets.set(key, { startedAt: now, count: 1 })
        return { allowed: true, remaining: Math.max(options.limit - 1, 0), retryAfter: 0 }
      }
      current.count += 1
      const allowed = current.count <= options.limit
      return {
        allowed,
        remaining: Math.max(options.limit - current.count, 0),
        retryAfter: Math.ceil((options.windowMs - (now - current.startedAt)) / 1000),
      }
    },
  }
}

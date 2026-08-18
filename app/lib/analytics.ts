import { getSql, type Sql } from './db'
import { readEnv } from './env'

export type ApiRequestEntry = {
  ts: string
  route: string
  status: number
  duration_ms: number
  ip_hash: string
  referer_domain: string | null
  ua_class: string
  pair: string | null
}

export type UaClass = 'browser' | 'script' | 'bot'

const FLUSH_THRESHOLD = 100
const FLUSH_INTERVAL_MS = 5_000

export function clientIp(headers: Headers): string {
  const cf = headers.get('cf-connecting-ip')
  if (cf) return cf
  const forwarded = headers.get('x-forwarded-for')
  const hops = forwarded?.split(',').map((value) => value.trim()).filter(Boolean)
  return hops?.at(-1) || 'unknown'
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Salt rotates daily so hashes cannot be joined across days. */
export function dailySalt(date = new Date()): string | null {
  const base = readEnv('ANALYTICS_SALT') || readEnv('ADMIN_TOKEN')
  if (!base) return null
  return `${base}:${date.toISOString().slice(0, 10)}`
}

export function classifyUserAgent(userAgent: string | null): UaClass {
  const value = (userAgent ?? '').toLowerCase()
  if (/bot|spider|crawler/.test(value)) return 'bot'
  if (/^(curl\/|wget|python-|go-http|node|axios|postman)/.test(value)) return 'script'
  return 'browser'
}

export function refererDomain(referer: string | null): string | null {
  if (!referer) return null
  try {
    return new URL(referer).hostname
  } catch {
    return null
  }
}

export function pairForRoute(route: string, query: Record<string, string | undefined>): string | null {
  if (route !== '/api/convert' && route !== '/api/forecast') return null
  const from = query.from?.trim().toUpperCase()
  const to = query.to?.trim().toUpperCase()
  return from && to ? `${from}/${to}` : null
}

export type AnalyticsWriter = { insertApiRequests(rows: ApiRequestEntry[]): Promise<void> }

/** Buffers entries in memory and writes them in batches; a failed batch is dropped, never retried into unbounded growth. */
export function createRequestRecorder(writer: AnalyticsWriter | null, options: { threshold?: number; intervalMs?: number; onError?: (error: unknown) => void } = {}) {
  const threshold = options.threshold ?? FLUSH_THRESHOLD
  const intervalMs = options.intervalMs ?? FLUSH_INTERVAL_MS
  let buffer: ApiRequestEntry[] = []
  let flushing = false
  let timer: ReturnType<typeof setInterval> | null = null

  async function flush() {
    if (flushing || !buffer.length) return
    flushing = true
    const rows = buffer
    buffer = []
    try {
      await Promise.race([
        writer!.insertApiRequests(rows),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('analytics flush timed out')), 3_000)),
      ])
    } catch (error) {
      options.onError?.(error)
    } finally {
      flushing = false
    }
  }

  function ensureTimer() {
    if (timer != null) return
    timer = setInterval(() => { void flush() }, intervalMs)
    ;(timer as unknown as { unref?: () => void }).unref?.()
  }

  return {
    record(entry: ApiRequestEntry) {
      if (!writer) return
      buffer.push(entry)
      if (buffer.length >= threshold) void flush()
      else ensureTimer()
    },
    flushAll: flush,
    shutdown: async () => { if (timer != null) clearInterval(timer); timer = null; await flush() },
  }
}

export function getAnalyticsWriter(): AnalyticsWriter | null {
  if (!readEnv('ANALYTICS_SALT') && !readEnv('ADMIN_TOKEN')) return null
  const sql = getSql()
  if (!sql) return null
  return {
    async insertApiRequests(rows) {
      const values = rows.map((row) => [row.ts, row.route, row.status, row.duration_ms, row.ip_hash, row.referer_domain, row.ua_class, row.pair])
      // postgres.js serializes nulls fine but its insert-helper types reject them.
      await sql`INSERT INTO api_requests (ts, route, status, duration_ms, ip_hash, referer_domain, ua_class, pair) VALUES ${sql(values as unknown as (string | number)[][])}`
    },
  }
}

/** Builds a complete entry from request data; used by the API telemetry middleware and tests. */
export async function buildEntry(input: { path: string; query: Record<string, string | undefined>; status: number; durationMs: number; headers: Headers; now?: Date }): Promise<ApiRequestEntry> {
  const now = input.now ?? new Date()
  return {
    ts: now.toISOString(),
    route: input.path,
    status: input.status,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    ip_hash: await hashIp(clientIp(input.headers), dailySalt(now) ?? 'telemetry-disabled'),
    referer_domain: refererDomain(input.headers.get('referer')),
    ua_class: classifyUserAgent(input.headers.get('user-agent')),
    pair: pairForRoute(input.path, input.query),
  }
}

export type DashboardStats = {
  requests_24h: number
  errors_24h: number
  uniques_24h: number
  p50_ms: number | null
  p95_ms: number | null
  requests_7d: number
  requests_30d: number
  hourly: Array<{ hour: string; requests: number; errors: number }>
  topRoutes: Array<{ route: string; requests: number }>
  topPairs: Array<{ pair: string; requests: number }>
  topReferers: Array<{ domain: string; requests: number }>
  uaSplit: Array<{ ua_class: string; requests: number }>
}

export type PipelineStats = {
  updates: Array<{ fetched_at: string; source: string; status: string; error_text: string | null }>
  latest_fetched_at: string | null
  latest_rate_date: string | null
  daily_rows: number
}

/** Condenses complete raw hours into api_requests_hourly and prunes raw rows past 90 days. Idempotent. */
export async function rollupAndPrune(sql: Sql): Promise<{ hours: number; pruned: number }> {
  const rolled = await sql`
    INSERT INTO api_requests_hourly (hour_utc, route, requests, errors, avg_ms, p95_ms, uniques)
    SELECT date_trunc('hour', r.ts), r.route,
      count(*)::int,
      count(*) FILTER (WHERE r.status >= 400)::int,
      avg(r.duration_ms)::float8,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY r.duration_ms)::float8,
      count(DISTINCT r.ip_hash)::int
    FROM api_requests r
    WHERE r.ts < date_trunc('hour', now())
      AND NOT EXISTS (
        SELECT 1 FROM api_requests_hourly h
        WHERE h.hour_utc = date_trunc('hour', r.ts) AND h.route = r.route
      )
    GROUP BY 1, 2
    ON CONFLICT (hour_utc, route) DO NOTHING
    RETURNING 1`
  const pruned = await sql`WITH deleted AS (DELETE FROM api_requests WHERE ts < now() - (90 * interval '1 day') RETURNING 1) SELECT count(*)::int AS n FROM deleted`
  return { hours: rolled.length, pruned: Number((pruned[0] as { n: number } | undefined)?.n ?? 0) }
}

export async function runRollup(): Promise<void> {
  const sql = getSql()
  if (!sql) return
  try {
    await rollupAndPrune(sql)
  } catch (error) {
    console.error('hourly rollup failed:', error)
  }
}

const HOUR_LABEL = 'YYYY-MM-DD"T"HH24:00:00Z'

export async function getDashboardStats(sql: Sql): Promise<DashboardStats> {
  const [totalsRows, weekRows, monthRows, hourlyRolled, hourlyLive, routes, pairs, referers, uas] = await Promise.all([
    sql`SELECT count(*)::int AS requests, count(*) FILTER (WHERE status >= 400)::int AS errors, count(DISTINCT ip_hash)::int AS uniques,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p50,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms)::float8 AS p95
        FROM api_requests WHERE ts >= now() - interval '24 hours'`,
    sql`SELECT coalesce(sum(requests), 0)::int AS n FROM api_requests_hourly WHERE hour_utc >= now() - interval '7 days'`,
    sql`SELECT coalesce(sum(requests), 0)::int AS n FROM api_requests_hourly WHERE hour_utc >= now() - interval '30 days'`,
    sql`SELECT to_char(hour_utc AT TIME ZONE 'UTC', ${HOUR_LABEL}) AS hour, sum(requests)::int AS requests, sum(errors)::int AS errors
        FROM api_requests_hourly WHERE hour_utc >= now() - interval '48 hours' GROUP BY 1`,
     sql`SELECT to_char(date_trunc('hour', ts) AT TIME ZONE 'UTC', ${HOUR_LABEL}) AS hour, count(*)::int AS requests, count(*) FILTER (WHERE status >= 400)::int AS errors
         FROM api_requests WHERE ts >= date_trunc('hour', now()) - interval '1 hour' GROUP BY 1`,
    sql`SELECT route, count(*)::int AS requests FROM api_requests WHERE ts >= now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
    sql`SELECT pair, count(*)::int AS requests FROM api_requests WHERE pair IS NOT NULL AND ts >= now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
    sql`SELECT coalesce(referer_domain, '(direct)') AS domain, count(*)::int AS requests FROM api_requests WHERE ts >= now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
    sql`SELECT ua_class, count(*)::int AS requests FROM api_requests WHERE ts >= now() - interval '24 hours' GROUP BY 1 ORDER BY 2 DESC`,
  ])
  const totals = totalsRows[0] as unknown as { requests: number; errors: number; uniques: number; p50: number | null; p95: number | null }
  const byHour = new Map<string, { requests: number; errors: number }>()
  for (const row of hourlyRolled as unknown as Array<{ hour: string; requests: number; errors: number }>) byHour.set(row.hour, { requests: row.requests, errors: row.errors })
  for (const row of hourlyLive as unknown as Array<{ hour: string; requests: number; errors: number }>) byHour.set(row.hour, { requests: row.requests, errors: row.errors })
  // 48 zero-filled slots ending at the current hour (rolled history + live raw hour).
  const hourly: DashboardStats['hourly'] = []
  const slot = new Date()
  slot.setUTCMinutes(0, 0, 0)
  slot.setUTCHours(slot.getUTCHours() - 47)
  for (let index = 0; index < 48; index += 1) {
    const label = `${slot.toISOString().slice(0, 13)}:00:00Z`
    const point = byHour.get(label)
    hourly.push({ hour: label, requests: point?.requests ?? 0, errors: point?.errors ?? 0 })
    slot.setUTCHours(slot.getUTCHours() + 1)
  }
  return {
    requests_24h: totals.requests,
    errors_24h: totals.errors,
    uniques_24h: totals.uniques,
    p50_ms: totals.p50,
    p95_ms: totals.p95,
    requests_7d: (weekRows[0] as unknown as { n: number }).n,
    requests_30d: (monthRows[0] as unknown as { n: number }).n,
    hourly,
    topRoutes: routes as unknown as DashboardStats['topRoutes'],
    topPairs: pairs as unknown as DashboardStats['topPairs'],
    topReferers: referers as unknown as DashboardStats['topReferers'],
    uaSplit: uas as unknown as DashboardStats['uaSplit'],
  }
}

export async function getPipelineStats(sql: Sql): Promise<PipelineStats> {
  const [updates, freshness] = await Promise.all([
    sql`SELECT to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS fetched_at, source, status, error_text
        FROM rate_updates ORDER BY id DESC LIMIT 10`,
    sql`SELECT to_char(max(fetched_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS latest_fetched_at,
          max(date)::text AS latest_rate_date, count(*)::int AS daily_rows FROM daily_rates`,
  ])
  const fresh = (freshness[0] ?? {}) as { latest_fetched_at?: string | null; latest_rate_date?: string | null; daily_rows?: number }
  return {
    updates: updates as unknown as PipelineStats['updates'],
    latest_fetched_at: fresh.latest_fetched_at ?? null,
    latest_rate_date: fresh.latest_rate_date ?? null,
    daily_rows: fresh.daily_rows ?? 0,
  }
}

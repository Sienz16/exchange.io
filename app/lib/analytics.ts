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
  const first = forwarded?.split(',')[0].trim()
  return first || 'unknown'
}

export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${ip}`))
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Salt rotates daily so hashes cannot be joined across days. */
export function dailySalt(date = new Date()): string {
  const base = readEnv('ANALYTICS_SALT') ?? readEnv('ADMIN_TOKEN') ?? 'exchange-io'
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
      await writer!.insertApiRequests(rows)
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
  }
}

export function getAnalyticsWriter(): AnalyticsWriter | null {
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
    ip_hash: await hashIp(clientIp(input.headers), dailySalt(now)),
    referer_domain: refererDomain(input.headers.get('referer')),
    ua_class: classifyUserAgent(input.headers.get('user-agent')),
    pair: pairForRoute(input.path, input.query),
  }
}

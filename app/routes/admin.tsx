import { createRoute } from 'honox/factory'
import type { FC, PropsWithChildren } from 'react'
import { adminToken, verifySessionCookie } from '../lib/admin-auth'
import { getDashboardStats, getPipelineStats, rollupAndPrune, type DashboardStats, type PipelineStats } from '../lib/analytics'
import { getSql } from '../lib/db'
import { getCacheStats, getRateServiceStatus } from '../lib/rates'

const page = 'mx-auto w-full max-w-[1200px] px-6'
const card = 'rounded-2xl border border-line bg-[image:var(--card-gradient)] shadow-[var(--shadow-card)]'
const label = 'font-mono text-[.62rem] font-medium uppercase tracking-[.16em] text-faint'
const inputClass = 'w-full rounded-[10px] border border-line bg-recess px-4 py-3 font-mono text-[.8rem] text-fg outline-0 focus:border-accent-strong'

const fmt = new Intl.NumberFormat('en-US')

function ageHours(iso: string | null): number | null {
  if (!iso) return null
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? null : (Date.now() - parsed) / 3_600_000
}

function formatAge(hours: number): string {
  return hours < 1 ? `${Math.max(1, Math.round(hours * 60))} min` : `${hours.toFixed(hours < 10 ? 1 : 0)} h`
}

const pageMeta = (title: string) => ({ title, description: 'Private operations dashboard' })

const AdminShell: FC<PropsWithChildren<{ active: boolean }>> = ({ active, children }) => (
  <main>
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl">
      <div className={page + ' flex min-h-16 items-center justify-between'}>
        <a className="font-display text-[1.12rem] font-bold tracking-[-.05em]" href="/">exchange<span className="text-accent-strong">.io</span>
          <span className="ml-3 font-mono text-[.66rem] font-medium uppercase tracking-[.14em] text-faint">/ admin</span>
        </a>
        <div className="flex items-center gap-4 font-mono text-[.7rem] font-medium uppercase tracking-[.1em] text-muted">
          {active && <>
            <a href="/admin" className="transition-colors hover:text-accent-strong">Refresh</a>
            <form method="post" action="/admin/logout">
              <button type="submit" className="rounded-lg border border-line px-3.5 py-2 transition-colors hover:border-accent-strong hover:text-accent-strong">Sign out</button>
            </form>
          </>}
        </div>
      </div>
    </header>
    <div className={page + ' py-10'}>{children}</div>
    <footer className={page + ' flex flex-wrap justify-between gap-3 border-t border-line py-6 pb-10 font-mono text-[.64rem] text-faint'}>
      <span>Times UTC · uniques are daily-rotating salted hashes · 7d/30d from hourly rollups</span>
      <span>Cache counters reflect the serving process only</span>
    </footer>
  </main>
)

const LoginPanel: FC<{ error: boolean }> = ({ error }) => (
  <div className="mx-auto max-w-[420px] pt-16">
    <div className={card + ' p-8'}>
      <h1 className="font-display text-[1.6rem] font-bold tracking-[-.02em]">Admin sign in</h1>
      <p className="mt-2 font-mono text-[.7rem] leading-relaxed text-faint">Enter the ADMIN_TOKEN configured for this deployment.</p>
      <form method="post" action="/admin/login" className="mt-6 flex flex-col gap-3">
        <input type="password" name="token" autoComplete="current-password" autoFocus required placeholder="ADMIN_TOKEN"
          aria-label="Admin token" className={inputClass} />
        {error && <p role="alert" className="font-mono text-[.7rem] text-danger">Invalid token.</p>}
        <button type="submit" className="rounded-[10px] bg-accent px-4 py-3 font-mono text-[.74rem] font-semibold uppercase tracking-[.1em] text-on-accent transition-all hover:-translate-y-0.5">Sign in →</button>
      </form>
    </div>
  </div>
)

const DisabledPanel = () => (
  <div className="mx-auto max-w-[560px] pt-16">
    <div className={card + ' p-8'}>
      <span className={label}>Dashboard disabled</span>
      <h1 className="mt-3 font-display text-[1.6rem] font-bold tracking-[-.02em]">Set ADMIN_TOKEN to enable</h1>
      <p className="mt-3 text-[.88rem] leading-[1.7] text-muted">The admin dashboard is off unless a token is configured. Add a long random secret, restart, and return here:</p>
      <pre className="mt-5 overflow-x-auto rounded-[10px] border border-line bg-recess px-4 py-3 font-mono text-[.72rem] text-alt-strong"><code>{`# .env (Bun)
ADMIN_TOKEN=<long-random-string>

# or Cloudflare Workers
wrangler secret put ADMIN_TOKEN`}</code></pre>
    </div>
  </div>
)

const NoDatabasePanel = () => (
  <div className={card + ' mx-auto max-w-[560px] p-8'}>
    <span className={label}>Telemetry unavailable</span>
    <h1 className="mt-3 font-display text-[1.6rem] font-bold tracking-[-.02em]">No database configured</h1>
    <p className="mt-3 text-[.88rem] leading-[1.7] text-muted">Request telemetry and pipeline stats need PostgreSQL. Set <code className="font-mono text-[.8rem] text-alt-strong">DATABASE_URL</code> and apply the schema:</p>
    <pre className="mt-5 overflow-x-auto rounded-[10px] border border-line bg-recess px-4 py-3 font-mono text-[.72rem] text-alt-strong"><code>{`psql "$DATABASE_URL" -f app/lib/schema.sql`}</code></pre>
  </div>
)

const ErrorPanel: FC<{ message: string }> = ({ message }) => (
  <div className={card + ' mx-auto max-w-[560px] p-8'}>
    <span className={label}>Stats unavailable</span>
    <p className="mt-3 font-mono text-[.78rem] leading-[1.7] text-danger">{message}</p>
  </div>
)

const StatCard: FC<{ label: string; value: string; hint?: string; danger?: boolean }> = ({ label, value, hint, danger }) => (
  <div className={card + ' p-5'}>
    <span className={label}>{label}</span>
    <strong className={danger ? 'mt-2 block font-display text-[1.9rem] font-bold leading-none tracking-[-.02em] tabular-nums text-danger' : 'mt-2 block font-display text-[1.9rem] font-bold leading-none tracking-[-.02em] tabular-nums'}>{value}</strong>
    {hint && <span className="mt-1.5 block font-mono text-[.62rem] text-faint">{hint}</span>}
  </div>
)

const HourlyChart: FC<{ hourly: DashboardStats['hourly'] }> = ({ hourly }) => {
  const max = Math.max(...hourly.map((point) => point.requests), 1)
  const barWidth = 480 / (hourly.length || 1)
  return (
    <svg viewBox="0 0 480 140" preserveAspectRatio="none" className="h-44 w-full" role="img" aria-label="Requests per hour, last 48 hours">
      {hourly.map((point, index) => {
        const total = (point.requests / max) * 130
        const errors = (point.errors / max) * 130
        const x = index * barWidth
        return (
          <g key={point.hour}>
            <title>{`${point.hour} — ${point.requests} requests${point.errors ? `, ${point.errors} errors` : ''}`}</title>
            <rect x={x + barWidth * 0.15} y={140 - total + errors} width={barWidth * 0.7} height={Math.max(total - errors, 0)} fill="var(--color-accent)" opacity={0.85} />
            {point.errors > 0 && <rect x={x + barWidth * 0.15} y={140 - total} width={barWidth * 0.7} height={errors} fill="var(--color-danger)" />}
          </g>
        )
      })}
    </svg>
  )
}

const Breakdown: FC<{ title: string; rows: Array<{ name: string; value: number }> }> = ({ title, rows }) => {
  const max = Math.max(...rows.map((row) => row.value), 1)
  return (
    <div className={card + ' p-5'}>
      <span className={label}>{title}</span>
      {rows.length === 0
        ? <p className="mt-3 font-mono text-[.7rem] text-faint">No data yet</p>
        : <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {rows.map((row) => (
              <li key={row.name} className="relative overflow-hidden rounded-md bg-recess px-3 py-2">
                <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-[var(--color-accent)] opacity-10" style={{ width: `${(row.value / max) * 100}%` }} />
                <span className="relative flex justify-between gap-3 font-mono text-[.72rem]">
                  <span className="min-w-0 truncate text-fg">{row.name}</span>
                  <span className="flex-none tabular-nums text-muted">{fmt.format(row.value)}</span>
                </span>
              </li>
            ))}
          </ul>}
    </div>
  )
}

const PipelinePanel: FC<{ pipeline: PipelineStats }> = ({ pipeline }) => {
  const age = ageHours(pipeline.latest_fetched_at)
  const stale = age != null && age > 26
  const cache = getCacheStats()
  const status = getRateServiceStatus()
  return (
    <div className={card + ' p-6'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={label}>Data pipeline</span>
        <span className="font-mono text-[.64rem] text-faint">{fmt.format(pipeline.daily_rows)} daily rows · newest rate_date {pipeline.latest_rate_date ?? '—'}</span>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4">
          <div>
            <span className={label}>Snapshot freshness</span>
            <p className="mt-2 font-mono text-[.78rem] text-muted">
              {age == null ? 'No stored rates' : <>newest snapshot <strong className={stale ? 'font-semibold text-danger' : 'font-semibold text-fg'}>{formatAge(age)}</strong> ago
              {stale && <span className="ml-2 rounded border border-danger/40 px-1.5 py-0.5 text-[.6rem] uppercase tracking-[.12em] text-danger">stale</span>}</>}
            </p>
          </div>
          <div>
            <span className={label}>Rate service (this process)</span>
            <p className="mt-2 font-mono text-[.78rem] text-muted">status <strong className="font-semibold text-fg">{status.status}</strong></p>
            <div className="mt-2 grid grid-cols-4 gap-2 font-mono text-[.64rem]">
              {[['live', cache.live_fetch], ['db', cache.db_read], ['cache', cache.cache_hit], ['stale', cache.stale_fallback]].map(([name, value]) => (
                <span key={name as string} className="rounded-md border border-line bg-recess px-2 py-1.5 text-center">
                  <b className="block text-[.78rem] font-semibold tabular-nums text-fg">{fmt.format(value as number)}</b>
                  <span className="text-faint">{name as string}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div>
          <span className={label}>Ingest history (last 10)</span>
          {pipeline.updates.length === 0
            ? <p className="mt-3 font-mono text-[.7rem] text-faint">No fetch jobs recorded yet</p>
            : <ul className="mt-3 flex list-none flex-col gap-1.5 p-0">
                {pipeline.updates.map((update) => (
                  <li key={update.fetched_at + update.status} className="flex items-center gap-3 rounded-md bg-recess px-3 py-2 font-mono text-[.68rem]">
                    <span aria-hidden="true" className={update.status === 'success' ? 'inline-block h-2 w-2 flex-none rounded-full bg-accent' : 'inline-block h-2 w-2 flex-none rounded-full bg-danger'} />
                    <span className="flex-none text-faint">{update.fetched_at}</span>
                    <span className="flex-none text-muted">{update.source}</span>
                    <span className="min-w-0 flex-1 truncate text-right text-danger">{update.error_text ?? ''}</span>
                  </li>
                ))}
              </ul>}
        </div>
      </div>
    </div>
  )
}

const DashboardBody: FC<{ stats: DashboardStats; pipeline: PipelineStats }> = ({ stats, pipeline }) => {
  const errorRate = stats.requests_24h ? (stats.errors_24h / stats.requests_24h) * 100 : 0
  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Overview" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Requests 24h" value={fmt.format(stats.requests_24h)} hint={`${errorRate.toFixed(1)}% errors`} />
        <StatCard label="Errors 24h" value={fmt.format(stats.errors_24h)} danger={stats.errors_24h > 0} />
        <StatCard label="Uniques 24h" value={fmt.format(stats.uniques_24h)} hint="salted daily hashes" />
        <StatCard label="Latency p50/p95" value={stats.p50_ms == null ? '—' : `${Math.round(stats.p50_ms)}/${Math.round(stats.p95_ms ?? 0)}`} hint="ms, 24h" />
        <StatCard label="Requests 7d" value={fmt.format(stats.requests_7d)} hint="hourly rollup" />
        <StatCard label="Requests 30d" value={fmt.format(stats.requests_30d)} hint="hourly rollup" />
      </section>

      <section aria-label="Traffic" className={card + ' p-6'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={label}>Requests per hour — last 48h</span>
          <span className="flex items-center gap-4 font-mono text-[.62rem] text-faint">
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-accent" /> success</span>
            <span className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-danger" /> errors</span>
          </span>
        </div>
        <div className="mt-4">
          <HourlyChart hourly={stats.hourly} />
        </div>
      </section>

      <section aria-label="Breakdowns" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Breakdown title="Top routes (24h)" rows={stats.topRoutes.map((row) => ({ name: row.route, value: row.requests }))} />
        <Breakdown title="Top pairs (24h)" rows={stats.topPairs.map((row) => ({ name: row.pair, value: row.requests }))} />
        <Breakdown title="Top referers (24h)" rows={stats.topReferers.map((row) => ({ name: row.domain, value: row.requests }))} />
        <Breakdown title="Client mix (24h)" rows={stats.uaSplit.map((row) => ({ name: row.ua_class, value: row.requests }))} />
      </section>

      <PipelinePanel pipeline={pipeline} />
    </div>
  )
}

export default createRoute(async (c) => {
  const token = adminToken()
  if (!token) return c.render(<AdminShell active={false}><DisabledPanel /></AdminShell>, pageMeta('Admin — disabled'))
  if (!(await verifySessionCookie(c.req.header('Cookie'), token))) {
    return c.render(<AdminShell active={false}><LoginPanel error={c.req.query('error') === '1'} /></AdminShell>, pageMeta('Admin — sign in'))
  }
  const sql = getSql()
  if (!sql) return c.render(<AdminShell active><NoDatabasePanel /></AdminShell>, pageMeta('Admin'))
  try {
    await rollupAndPrune(sql) // defensive: cover missed cron runs before reading
    const [stats, pipeline] = await Promise.all([getDashboardStats(sql), getPipelineStats(sql)])
    return c.render(<AdminShell active><DashboardBody stats={stats} pipeline={pipeline} /></AdminShell>, pageMeta('Admin — exchange.io'))
  } catch (error) {
    return c.render(<AdminShell active><ErrorPanel message={error instanceof Error ? error.message : 'Stats unavailable'} /></AdminShell>, pageMeta('Admin'))
  }
})

import { createRoute } from 'honox/factory'
import { requestOrigin } from '../lib/origin'
export default createRoute(async (c) => {
  const response = await fetch(`${requestOrigin(c)}/api/health`).catch(() => null)
  const body = response ? await response.json().catch(() => ({ status: 'unavailable' })) as { status?: string } : { status: 'unavailable' }
  const healthy = body.status === 'ok'
  return c.render(<main className="mx-auto min-h-screen max-w-[760px] px-6 py-24"><a href="/">exchange<span className="text-accent-strong">.io</span></a><p className="mt-16 font-mono text-xs uppercase tracking-[.16em] text-faint">STATUS</p><h1 className="mt-4 font-display text-6xl font-bold">{healthy ? 'All systems operational.' : 'Service degraded.'}</h1><p className="mt-6 text-muted">API health: <strong>{body.status ?? 'unavailable'}</strong>. Reference data freshness is exposed by <a className="underline" href="/api/health">the health endpoint</a>.</p></main>, { title: 'Status — exchange.io', description: 'exchange.io API status and data freshness.' })
})

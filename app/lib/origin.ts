import type { Context } from 'hono'

/**
 * Absolute origin of the incoming request, for URLs that must be absolute
 * (sitemap <loc>, robots Sitemap, curl examples). No hardcoded domain: the
 * site works under any host. Forwarded headers are honored so a TLS-terminating
 * reverse proxy (nginx/caddy) yields https URLs; they should not be exposed
 * directly to untrusted clients.
 */
export function requestOrigin(c: Context): string {
  const url = new URL(c.req.url)
  const proto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim() ?? url.protocol.replace(':', '')
  const host = c.req.header('x-forwarded-host')?.split(',')[0]?.trim() ?? url.host
  return `${proto}://${host}`
}

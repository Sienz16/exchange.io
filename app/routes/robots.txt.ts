import type { Context } from 'hono'
import { requestOrigin } from '../lib/origin'

export default (c: Context) => new Response(
  `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${requestOrigin(c)}/sitemap.xml\n`,
  { headers: { 'Content-Type': 'text/plain; charset=UTF-8' } },
)

import type { Context } from 'hono'
import { requestOrigin } from '../lib/origin'

const urls = ['/', '/docs', '/playground']

export default (c: Context) => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${requestOrigin(c)}${path}</loc></url>`).join('')}</urlset>`,
  { headers: { 'Content-Type': 'application/xml; charset=UTF-8' } },
)

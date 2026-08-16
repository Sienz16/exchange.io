export default () => new Response(
  'User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://exchange.io/sitemap.xml\n',
  { headers: { 'Content-Type': 'text/plain; charset=UTF-8' } },
)

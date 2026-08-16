import { showRoutes } from 'hono/dev'
import { createApp } from 'honox/server'
import { corsHeaders } from './lib/api'

const app = createApp({
  init(app) {
    app.options('/api/*', (c) => new Response(null, { status: 204, headers: corsHeaders }))
    app.use('*', async (c, next) => {
      await next()
      if (c.req.path.startsWith('/api/')) {
        for (const [key, value] of Object.entries(corsHeaders)) c.header(key, value)
      }
    })
  },
})

showRoutes(app)

export default app

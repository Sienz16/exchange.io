import type { NotFoundHandler } from 'hono'

const handler: NotFoundHandler = (c) => {
  c.status(404)
  return c.render(
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-3xl font-bold">404 — Not Found</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
    </div>
  )
}

export default handler

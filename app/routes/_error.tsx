import type { ErrorHandler } from 'hono'

const handler: ErrorHandler = (e, c) => {
  if ('getResponse' in e) {
    return e.getResponse()
  }
  console.error(e.message)
  c.status(500)
  return c.render(
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-3xl font-bold">500 — Internal Server Error</h1>
      <p className="text-muted-foreground">Something went wrong on our end.</p>
    </div>
  )
}

export default handler

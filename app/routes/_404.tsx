import type { NotFoundHandler } from 'hono'

const handler: NotFoundHandler = (c) => {
  c.status(404)
  return c.render(
    <main className="flex min-h-screen flex-col items-center justify-center gap-1.5 p-10 text-center">
      <a className="mb-7 font-display text-[1.12rem] font-bold tracking-[-.05em]" href="/">exchange<span className="text-accent-strong">.io</span></a>
      <p className="m-0 bg-[image:var(--gradient-accent)] bg-clip-text font-display text-[clamp(5rem,14vw,8.5rem)] leading-none font-bold tracking-[-.04em] tabular-nums text-transparent">404</p>
      <h1 className="font-display text-[clamp(1.7rem,3.6vw,2.6rem)] font-semibold tracking-[-.02em]">Currency not found.<br />
        <em className="bg-[image:var(--gradient-accent)] bg-clip-text pr-[.06em] font-serif font-normal italic tracking-[-.01em] text-transparent">Page neither.</em>
      </h1>
      <p className="mt-2.5 max-w-[400px] text-muted">The page you're looking for doesn't exist — but 30 currencies do.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3.5">
        <a className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[10px] bg-accent px-6 font-mono text-[.74rem] font-semibold uppercase tracking-[.1em] text-on-accent transition-all hover:-translate-y-0.5" href="/playground">Open the converter <span aria-hidden="true">→</span></a>
        <a className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[10px] border border-line2 px-6 font-mono text-[.74rem] font-semibold uppercase tracking-[.1em] text-fg transition-colors hover:border-accent-strong hover:text-accent-strong" href="/">Back home</a>
      </div>
    </main>,
    { title: '404 — exchange.io' },
  )
}

export default handler

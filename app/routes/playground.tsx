import { createRoute } from 'honox/factory'
import { requestOrigin } from '../lib/origin'
import Playground from '../islands/playground'
import ThemeToggle from '../islands/theme-toggle'

const page = 'mx-auto w-full max-w-[1200px] px-6'
const em = 'bg-[image:var(--gradient-accent)] bg-clip-text pr-[.06em] font-serif font-normal italic tracking-[-.01em] text-transparent'

export default createRoute((c) => c.render(
  <main className="flex min-h-screen flex-col">
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl">
      <div className={page + ' flex min-h-16 items-center justify-between'}>
        <a className="font-display text-[1.12rem] font-bold tracking-[-.05em]" href="/">exchange<span className="text-accent-strong">.io</span></a>
        <nav className="flex items-center gap-6 font-mono text-[.7rem] font-medium uppercase tracking-[.1em] text-muted [&>a:hover]:text-accent-strong" aria-label="Page navigation">
          <a href="/" className="hidden sm:inline text-accent-strong">Home</a>
          <a href="/docs" className="hidden sm:inline">Docs</a>
          <ThemeToggle />
          <a className="rounded-lg border border-accent-strong/45 px-3.5 py-2.5 text-accent-strong transition-colors hover:bg-accent hover:text-on-accent" href="/#api">API <span aria-hidden="true">↗</span></a>
        </nav><details className="relative sm:hidden"><summary className="list-none rounded-lg border border-line px-3 py-2 font-mono text-xs">Menu</summary><nav className="absolute right-0 top-12 z-50 grid min-w-40 gap-3 rounded-lg border border-line bg-panel p-4 font-mono text-xs"><a href="/">Home</a><a href="/docs">Docs</a></nav></details>
      </div>
    </header>

    <section className={page + ' pt-19 pb-13'}>
      <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">
        <span className="mr-2.5 inline-block h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_rgba(212,247,79,0.15)] align-[1px]" /> PLAYGROUND / LIVE INSTRUMENT
      </p>
      <h1 className="mt-6 font-display text-[clamp(2.9rem,5.6vw,5.4rem)] font-bold leading-[.97] tracking-[-.03em]">Make the query.<br /><em className={em}>Read the record.</em></h1>
      <div className="mt-7 grid items-end gap-6.5 lg:grid-cols-[1fr_auto]">
        <p className="m-0 max-w-[540px] leading-[1.75] text-muted">Convert against the current daily reference snapshot. Pick your precision, swap directions, and inspect the raw JSON — every response includes enough metadata to reproduce it.</p>
        <dl className="m-0 flex flex-wrap self-start rounded-xl border border-line bg-panel">
          {[['CURRENCIES', '30'], ['KEY REQUIRED', 'None'], ['REFRESH', 'Daily']].map(([term, def], index) => (
            <div key={term} className={index > 0 ? 'border-l border-line px-6 py-3.5' : 'px-6 py-3.5'}>
              <dt className="font-mono text-[.58rem] font-medium tracking-[.14em] text-faint">{term}</dt>
              <dd className="m-0 mt-1 font-display text-[.95rem] font-semibold text-accent-strong">{def}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>

    <div className={page + ' flex-1 pb-10'}>
      <Playground origin={requestOrigin(c)} />
    </div>

    <footer className="mt-24">
      <div className={page + ' flex flex-wrap justify-between gap-3 py-5.5 pb-7.5 font-mono text-[.66rem] text-faint'}>
        <span>© 2026 exchange.io — reference currency infrastructure</span>
        <a href="/docs" className="text-muted hover:text-accent-strong">Full API documentation ↗</a>
      </div>
    </footer>
  </main>,
  { title: 'Playground — exchange.io', description: 'Convert currencies against the latest exchange.io reference snapshot, with adjustable precision and raw JSON output.' },
))

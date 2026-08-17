import { createRoute } from 'honox/factory'
import { requestOrigin } from '../lib/origin'
import ThemeToggle from '../islands/theme-toggle'

const page = 'mx-auto w-full max-w-[1200px] px-6'
const em = 'bg-[image:var(--gradient-accent)] bg-clip-text pr-[.06em] font-serif font-normal italic tracking-[-.01em] text-transparent'
const codeBlock = 'my-6 overflow-x-auto rounded-[10px] border border-line bg-[#070b14] px-5 py-4.5 font-mono text-[.74rem] leading-[1.75] text-[#a3b0c8]'
const sectionHeading = 'mt-5 mb-6.5 font-display text-[clamp(2.3rem,4.2vw,3.8rem)] font-bold leading-[.98] tracking-[-.03em]'
const endpoints = [
  {
    method: 'GET',
    path: '/api/latest?base=USD',
    title: 'Latest rates',
    description: 'Return the newest available reference snapshot for a base currency.',
    example: '/api/latest?base=USD',
    response: `{
  "base": "USD",
  "rates": { "EUR": 0.92, "JPY": 150.12 },
  "rate_date": "2026-08-16",
  "source": "",
  "fetched_at": "2026-08-16T00:04:12.000Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/convert?from=USD&to=EUR&amount=100',
    title: 'Convert',
    description: 'Convert a positive amount using the latest snapshot, or add date for a historical conversion.',
    example: '/api/convert?from=USD&to=EUR&amount=100',
    response: `{
  "from": "USD", "to": "EUR", "amount": 100,
  "result": 92, "rate": 0.92,
  "rate_date": "2026-08-16",
  "source": "",
  "fetched_at": "2026-08-16T00:04:12.000Z"
}`,
  },
  {
    method: 'GET',
    path: '/api/historical?date=2024-01-15&base=USD',
    title: 'Historical rates',
    description: 'Read the stored reference snapshot for an ISO calendar date and base currency.',
    example: '/api/historical?date=2024-01-15&base=USD',
    response: `{
  "base": "USD",
  "rates": { "EUR": 0.91, "JPY": 145.48 },
  "rate_date": "2024-01-15",
  "source": "ecb",
  "fetched_at": "2024-01-16T00:04:12.000Z"
}`,
  },
]

const extraEndpoints: Array<{ method: string; path: string; title: string; description: string; example: string; response?: string }> = [
  { method: 'GET', path: '/api/currencies', title: 'Supported currencies', description: 'List supported currency codes with display precision. Response also includes latest source metadata.', example: '/api/currencies' },
  { method: 'GET', path: '/api/forecast?from=USD&to=EUR&horizon=7', title: 'Forecast', description: 'Return an experimental baseline estimate and range for 1 to 30 days. Response includes model version, training date, and a mandatory disclaimer.', example: '/api/forecast?from=USD&to=EUR&horizon=7' },
  { method: 'GET', path: '/api/health', title: 'Health', description: 'Check API availability and rate-service state. Useful for monitoring, not for selecting a rate.', example: '' },
]

export default createRoute((c) => {
  const curl = (path: string) => `curl "${requestOrigin(c)}${path}"`
  return c.render(
    <main className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl">
        <div className={page + ' flex min-h-16 items-center justify-between'}>
          <a className="font-display text-[1.12rem] font-bold tracking-[-.05em]" href="/">exchange<span className="text-accent-strong">.io</span></a>
          <nav className="flex items-center gap-6 font-mono text-[.7rem] font-medium uppercase tracking-[.1em] text-muted [&>a:hover]:text-accent-strong" aria-label="Primary navigation">
            <a href="/#why" className="hidden sm:inline">Why</a>
            <a href="/playground" className="hidden sm:inline">Converter</a>
            <ThemeToggle />
            <a className="rounded-lg border border-accent-strong/45 px-3.5 py-2.5 text-accent-strong transition-colors hover:bg-accent hover:text-on-accent" href="/#api">API <span aria-hidden="true">↗</span></a>
          </nav>
        </div>
      </header>

      <section className={page + ' pt-19 pb-18'}>
        <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">/ DOCUMENTATION</p>
        <h1 className="mt-6 font-display text-[clamp(2.9rem,5.6vw,5.4rem)] font-bold leading-[.97] tracking-[-.03em]">Numbers with<br /><em className={em}>a paper trail.</em></h1>
        <p className="mt-7 max-w-[540px] leading-[1.75] text-muted">Small, public endpoints for current rates, historical records, conversions, supported currencies, and experimental forecasts.</p>
      </section>

      <section className={page + ' grid flex-1 gap-[8%] lg:grid-cols-[220px_1fr]'}>
        <aside className="lg:sticky lg:top-24 lg:self-start lg:pt-20" aria-label="Documentation navigation">
          <span className="mb-4.5 flex gap-4 border-b border-line pb-3.5 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint [&>span]:text-accent-strong"><span>01</span> ON THIS PAGE</span>
          <nav className="flex flex-wrap gap-x-4.5 gap-y-0 lg:flex-col lg:gap-0">
            {[['Quickstart', '#quickstart'], ['Endpoints', '#endpoints'], ['Date semantics', '#semantics'], ['Freshness & source', '#freshness'], ['Errors', '#errors'], ['Roadmap', '#roadmap']].map(([name, href]) => (
              <a key={href} href={href} className="py-2 font-mono text-[.72rem] tracking-[.04em] text-faint transition-colors hover:text-accent-strong">{name}</a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 pb-20">
          <section id="quickstart" className="border-b border-line py-21">
            <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">START HERE</p>
            <h2 className={sectionHeading}>One request.<br /><em className={em}>Readable output.</em></h2>
          <p className="max-w-[660px] leading-[1.8] text-muted">No key is required. Send query parameters over HTTPS and read JSON back. Amounts are numeric, currency codes are uppercase ISO 4217-style codes, and every rate response identifies its source and dates. Rates come from the <a className="underline" href="https://www.ecb.europa.eu/services/disclaimer/html/index.en.html" rel="noopener noreferrer" target="_blank">European Central Bank</a>; non-EUR bases are derived from ECB EUR references by exchange.io.</p>
            <pre className={codeBlock}><code>{curl('/api/convert?from=USD&to=EUR&amount=100')}</code></pre>
            <p className="text-[.8rem] text-faint">Free during this early access period. Add caching on your side when your workload does not need a fresh snapshot per request.</p>
          </section>

          <section id="endpoints" className="border-b border-line py-21">
            <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">THE API</p>
            <h2 className={sectionHeading}>Six useful<br /><em className={em}>surfaces.</em></h2>
            {[...endpoints, ...extraEndpoints].map((endpoint) => (
              <article key={endpoint.path} className="mt-13 border-t border-line pt-6.5">
                <div className="flex flex-wrap items-center gap-3 font-mono text-[.72rem] text-alt-strong">
                  <span className="rounded-md bg-accent px-2 py-1 font-mono text-[.6rem] font-semibold tracking-[.08em] text-on-accent">{endpoint.method}</span>
                  <code>{endpoint.path}</code>
                </div>
                <h3 className="mt-5 mb-2 font-display text-[1.5rem] font-semibold">{endpoint.title}</h3>
                <p className="m-0 leading-[1.75] text-muted">{endpoint.description}</p>
                {endpoint.example ? <pre className={codeBlock}><code>{curl(endpoint.example)}</code></pre> : null}
                {endpoint.response ? (
                  <details className="mt-3.5">
                    <summary className="cursor-pointer font-mono text-[.68rem] font-medium tracking-[.08em] text-accent-strong">Example response</summary>
                    <pre className={codeBlock + ' mt-3.5'}><code>{endpoint.response}</code></pre>
                  </details>
                ) : null}
              </article>
            ))}
          </section>

          {[
            {
              id: 'semantics', kicker: '02 / TIME', heading: <>Date<br /><em className={em}>semantics.</em></>,
              body: <>
                <p className="max-w-[660px] leading-[1.8] text-muted">Dates use `YYYY-MM-DD` and mean a UTC calendar day. A request for `2024-01-15` asks for the snapshot labelled January 15, not a rolling 24-hour window.</p>
                <p className="max-w-[660px] leading-[1.8] text-muted">Omit `date` from convert for latest data. Future dates are rejected with `future_date`. Historical availability depends on stored snapshots; missing records return `historical_unavailable` rather than silently substituting today&apos;s rate.</p>
              </>,
            },
            {
              id: 'freshness', kicker: '03 / PROVENANCE', heading: <>Freshness<br /><em className={em}>is visible.</em></>,
              body: <>
                <p className="max-w-[660px] leading-[1.8] text-muted">`rate_date` is the date represented by the rate. `fetched_at` is the UTC timestamp when exchange.io obtained or stored the snapshot. `source` names the upstream dataset.</p>
                <p className="max-w-[660px] leading-[1.8] text-muted">Latest data is refreshed on a daily schedule and may be temporarily served from the last known snapshot during upstream trouble. Inspect service state through `/api/health` and treat `fetched_at` as the freshness boundary.</p>
              </>,
            },
          ].map((section) => (
            <section key={section.id} id={section.id} className="grid gap-8 border-b border-line py-21 lg:grid-cols-[1fr_1.5fr] lg:gap-[8%]">
              <div>
                <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">{section.kicker}</p>
                <h2 className={sectionHeading}>{section.heading}</h2>
              </div>
              <div>{section.body}</div>
            </section>
          ))}

          <section className="my-13 rounded-2xl border border-line2 bg-panel p-7">
            <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">FORECAST NOTICE</p>
            <p className="m-0 mt-3.5 max-w-[700px] font-serif text-[1.15rem] leading-[1.6] italic text-fg">Forecasts are estimates from a simple historical baseline. They are not predictions, financial advice, or trading signals. Do not use them as the sole basis for a financial decision.</p>
          </section>

          <section id="errors" className="grid gap-8 border-b border-line py-21 lg:grid-cols-[1fr_1.5fr] lg:gap-[8%]">
            <div>
              <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">04 / FAILURE</p>
              <h2 className={sectionHeading}>Errors<br /><em className={em}>stay legible.</em></h2>
            </div>
            <div>
              <p className="max-w-[660px] leading-[1.8] text-muted">Errors use JSON with `error`, `message`, and `details`. Common codes:</p>
              <ul className="my-4.5 list-disc pl-4.5 leading-[2.15] text-muted">
                {[
                  ['invalid_query', 'missing, malformed, or non-positive input.'],
                  ['unsupported_currency', 'code is not available from the configured source.'],
                  ['future_date', 'requested date is after today in UTC.'],
                  ['historical_unavailable', 'no stored snapshot matches date and base.'],
                  ['forecast_unavailable', 'insufficient historical pair data.'],
                ].map(([code, text]) => (
                  <li key={code}><code className="font-mono text-[.82em] text-alt-strong">{code}</code> — {text}</li>
                ))}
              </ul>
            </div>
          </section>

          <section id="roadmap" className="grid gap-8 py-21 lg:grid-cols-[1fr_1.5fr] lg:gap-[8%]">
            <div>
              <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint">05 / NEXT</p>
              <h2 className={sectionHeading}>What comes<br /><em className={em}>after v1.</em></h2>
            </div>
            <ul className="my-0 list-disc pl-4.5 leading-[2.15] text-muted">
              <li>API keys and explicit rate limits for production consumers.</li>
              <li>Expanded historical coverage and import tooling.</li>
              <li>More source health signals and documented service-level targets.</li>
              <li>Improved forecast models with transparent backtesting.</li>
            </ul>
          </section>
        </div>
      </section>

      <footer>
        <div className={page + ' flex flex-wrap justify-between gap-3 py-5.5 pb-7.5 font-mono text-[.66rem] text-faint'}>
          <span>© 2026 exchange.io — reference currency infrastructure</span>
          <a href="/playground" className="text-muted hover:text-accent-strong">Open playground ↗</a>
        </div>
      </footer>
    </main>,
    { title: 'Docs — exchange.io', description: 'Documentation for the exchange.io currency exchange rates API.' },
  )
})

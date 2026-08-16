import { createRoute } from 'honox/factory'

const endpoints = [
  {
    method: 'GET',
    path: '/api/latest?base=USD',
    title: 'Latest rates',
    description: 'Return the newest available reference snapshot for a base currency.',
    example: 'curl "https://exchange.io/api/latest?base=USD"',
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
    example: 'curl "https://exchange.io/api/convert?from=USD&to=EUR&amount=100"',
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
    example: 'curl "https://exchange.io/api/historical?date=2024-01-15&base=USD"',
    response: `{
  "base": "USD",
  "rates": { "EUR": 0.91, "JPY": 145.48 },
  "rate_date": "2024-01-15",
  "source": "ecb",
  "fetched_at": "2024-01-16T00:04:12.000Z"
}`,
  },
]

export default createRoute((c) => c.render(
  <main>
    <header className="site-header page-width">
      <a className="wordmark" href="/">exchange<span>.io</span></a>
      <nav aria-label="Primary navigation">
        <a href="/#method">Method</a>
        <a href="/docs">Docs</a>
        <a href="/playground">Playground <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <section className="docs-header page-width">
      <p className="eyebrow">/ DOCUMENTATION</p>
      <h1>Numbers with<br /><em>a paper trail.</em></h1>
      <p>Small, public endpoints for current rates, historical records, conversions, supported currencies, and experimental forecasts.</p>
    </section>

    <section className="docs-layout page-width">
      <aside className="docs-index" aria-label="Documentation navigation">
        <span className="section-label"><span>01</span> ON THIS PAGE</span>
        <a href="#quickstart">Quickstart</a>
        <a href="#endpoints">Endpoints</a>
        <a href="#semantics">Date semantics</a>
        <a href="#freshness">Freshness &amp; source</a>
        <a href="#errors">Errors</a>
        <a href="#roadmap">Roadmap</a>
      </aside>

      <div className="docs-content">
        <section id="quickstart" className="docs-section">
          <p className="eyebrow">START HERE</p>
          <h2>One request.<br /><em>Readable output.</em></h2>
          <p>No key is required. Send query parameters over HTTPS and read JSON back. Amounts are numeric, currency codes are uppercase ISO 4217-style codes, and every rate response identifies its source and dates.</p>
          <pre className="docs-code"><code>{'curl "https://exchange.io/api/convert?from=USD&to=EUR&amount=100"'}</code></pre>
          <p className="docs-note">Free during this early access period. Add caching on your side when your workload does not need a fresh snapshot per request.</p>
        </section>

        <section id="endpoints" className="docs-section">
          <p className="eyebrow">THE API</p>
          <h2>Six useful<br /><em>surfaces.</em></h2>
          {endpoints.map((endpoint) => (
            <article className="endpoint" key={endpoint.path}>
              <div className="endpoint-heading"><span className="http-method">{endpoint.method}</span><code>{endpoint.path}</code></div>
              <h3>{endpoint.title}</h3>
              <p>{endpoint.description}</p>
              <pre className="docs-code"><code>{endpoint.example}</code></pre>
              <details><summary>Example response</summary><pre className="docs-code"><code>{endpoint.response}</code></pre></details>
            </article>
          ))}
          <article className="endpoint">
            <div className="endpoint-heading"><span className="http-method">GET</span><code>/api/currencies</code></div>
            <h3>Supported currencies</h3>
            <p>List supported currency codes with display precision. Response also includes latest source metadata.</p>
            <pre className="docs-code"><code>{'curl "https://exchange.io/api/currencies"'}</code></pre>
          </article>
          <article className="endpoint">
            <div className="endpoint-heading"><span className="http-method">GET</span><code>/api/forecast?from=USD&amp;to=EUR&amp;horizon=7</code></div>
            <h3>Forecast</h3>
            <p>Return an experimental baseline estimate and range for 1 to 30 days. Response includes model version, training date, and a mandatory disclaimer.</p>
            <pre className="docs-code"><code>{'curl "https://exchange.io/api/forecast?from=USD&to=EUR&horizon=7"'}</code></pre>
          </article>
          <article className="endpoint">
            <div className="endpoint-heading"><span className="http-method">GET</span><code>/api/health</code></div>
            <h3>Health</h3>
            <p>Check API availability and rate-service state. Useful for monitoring, not for selecting a rate.</p>
          </article>
        </section>

        <section id="semantics" className="docs-section split-section">
          <div><p className="eyebrow">02 / TIME</p><h2>Date<br /><em>semantics.</em></h2></div>
          <div>
            <p>Dates use `YYYY-MM-DD` and mean a UTC calendar day. A request for `2024-01-15` asks for the snapshot labelled January 15, not a rolling 24-hour window.</p>
            <p>Omit `date` from convert for latest data. Future dates are rejected with `future_date`. Historical availability depends on stored snapshots; missing records return `historical_unavailable` rather than silently substituting today&apos;s rate.</p>
          </div>
        </section>

        <section id="freshness" className="docs-section split-section">
          <div><p className="eyebrow">03 / PROVENANCE</p><h2>Freshness<br /><em>is visible.</em></h2></div>
          <div>
            <p>`rate_date` is the date represented by the rate. `fetched_at` is the UTC timestamp when exchange.io obtained or stored the snapshot. `source` names the upstream dataset.</p>
            <p>Latest data is refreshed on a daily schedule and may be temporarily served from the last known snapshot during upstream trouble. Inspect service state through `/api/health` and treat `fetched_at` as the freshness boundary.</p>
          </div>
        </section>

        <section id="errors" className="docs-section split-section">
          <div><p className="eyebrow">04 / FAILURE</p><h2>Errors<br /><em>stay legible.</em></h2></div>
          <div>
            <p>Errors use JSON with `error`, `message`, and `details`. Common codes:</p>
            <ul className="docs-list">
              <li><code>invalid_query</code> — missing, malformed, or non-positive input.</li>
              <li><code>unsupported_currency</code> — code is not available from the configured source.</li>
              <li><code>future_date</code> — requested date is after today in UTC.</li>
              <li><code>historical_unavailable</code> — no stored snapshot matches date and base.</li>
              <li><code>forecast_unavailable</code> — insufficient historical pair data.</li>
            </ul>
          </div>
        </section>

        <section className="docs-section disclaimer">
          <p className="eyebrow">FORECAST NOTICE</p>
          <p>Forecasts are estimates from a simple historical baseline. They are not predictions, financial advice, or trading signals. Do not use them as the sole basis for a financial decision.</p>
        </section>

        <section id="roadmap" className="docs-section split-section roadmap">
          <div><p className="eyebrow">05 / NEXT</p><h2>What comes<br /><em>after v1.</em></h2></div>
          <div>
            <ul className="docs-list">
              <li>API keys and explicit rate limits for production consumers.</li>
              <li>Expanded historical coverage and import tooling.</li>
              <li>More source health signals and documented service-level targets.</li>
              <li>Improved forecast models with transparent backtesting.</li>
            </ul>
          </div>
        </section>
      </div>
    </section>

    <footer className="site-footer page-width"><span>exchange.io / reference currency infrastructure</span><a href="/playground">Open playground ↗</a></footer>
  </main>,
  { title: 'Docs — exchange.io', description: 'Documentation for the exchange.io currency exchange rates API.' },
))

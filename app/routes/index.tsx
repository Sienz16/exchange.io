import { createRoute } from 'honox/factory'
import Playground from '../islands/playground'

const request = `curl "https://exchange.io/api/convert?from=USD&to=EUR&amount=100"`

export default createRoute((c) => c.render(
  <main>
    <header className="site-header page-width">
      <a className="wordmark" href="/">exchange<span>.io</span></a>
      <nav aria-label="Primary navigation">
        <a href="#method">Method</a>
        <a href="/docs">Docs</a>
        <a href="/playground">Playground <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <section className="hero page-width">
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-dot" /> DAILY REFERENCE RATES / API</p>
        <h1>Currency data<br /><em>without the fog.</em></h1>
        <p className="hero-dek">Clean conversion rates, useful history, and a small API built for people who need the number to make sense.</p>
        <a className="text-link" href="/playground">Try the instrument <span aria-hidden="true">→</span></a>
      </div>
      <div className="hero-instrument">
        <div className="section-label"><span>01</span> LIVE CONVERSION INSTRUMENT</div>
        <Playground compact />
      </div>
    </section>

    <section className="source-strip page-width" id="method">
      <div><span className="eyebrow">SOURCE</span><strong> exchangerate-api.com</strong></div>
      <div><span className="eyebrow">CADENCE</span><strong> daily reference snapshot</strong></div>
      <div><span className="eyebrow">FORMAT</span><strong> JSON / REST / no key</strong></div>
    </section>

    <section className="editorial-grid page-width">
      <div className="section-label"><span>02</span> WHY THIS EXISTS</div>
      <div className="editorial-copy">
        <h2>Rates are a record,<br /><em>not a guess.</em></h2>
        <p>Every response carries its source, rate date, and fetch time. Historical endpoints let you answer what a price meant then, not what a cache thinks it means now.</p>
        <div className="timeline" aria-label="Rate history timeline">
          <div><span>01</span><b>FETCH</b><small>source snapshot</small></div>
          <div><span>02</span><b>STORE</b><small>dated reference</small></div>
          <div><span>03</span><b>RETURN</b><small>traceable result</small></div>
        </div>
      </div>
    </section>

    <section className="api-preview page-width" id="api">
      <div className="section-label"><span>03</span> API PREVIEW</div>
      <div className="code-preview">
        <div className="code-heading"><span>GET /api/convert</span><span>200 OK</span></div>
        <pre><code>{request}</code></pre>
        <p>Built for scripts, prototypes, and products that prefer transparent inputs.</p>
      </div>
    </section>

    <footer className="site-footer page-width">
      <span>exchange.io / reference currency infrastructure</span>
      <a href="/playground">Open playground ↗</a>
    </footer>
  </main>,
   { title: 'exchange.io — Currency data without the fog', description: 'Clean currency exchange rates, history, conversion, and forecasts through a small public API.' },
))

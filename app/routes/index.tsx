import { createRoute } from 'honox/factory'
import { requestOrigin } from '../lib/origin'

export default createRoute((c) => c.render(
  <main className="landing-page">
    <header className="site-header page-width landing-header">
      <a className="wordmark" href="/">exchange<span>.io</span></a>
      <nav aria-label="Primary navigation">
        <a href="#why">Why exchange.io</a>
        <a href="/docs">Docs</a>
        <a className="nav-cta" href="/playground">Try the API <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <section className="hero page-width landing-hero">
      <div className="hero-network" aria-hidden="true">
        <svg viewBox="0 0 720 560" role="presentation">
          <path d="M86 430 270 285 440 350 624 112" />
          <path d="M270 285 352 92 624 112" />
          <path d="M86 430 352 92" />
          <circle cx="86" cy="430" r="6" /><circle cx="270" cy="285" r="6" /><circle cx="352" cy="92" r="6" /><circle cx="440" cy="350" r="6" /><circle cx="624" cy="112" r="6" />
        </svg>
        <span className="network-label network-label-one">USD / 01</span>
        <span className="network-label network-label-two">EUR / 02</span>
        <span className="network-label network-label-three">JPY / 03</span>
      </div>
      <div className="hero-copy">
        <p className="eyebrow"><span className="live-dot" /> DAILY REFERENCE RATES / OPEN API</p>
        <h1>Know what<br /><em>money means.</em></h1>
        <p className="hero-dek">A clear, traceable currency API for the moments when a number needs context, not confusion.</p>
        <div className="hero-actions">
          <a className="button button-primary" href="/playground">Try the converter <span aria-hidden="true">↗</span></a>
          <a className="button button-quiet" href="/docs">Read the docs</a>
        </div>
        <p className="hero-note"><span className="status-line" /> No key required · JSON over HTTP</p>
      </div>
      <div className="hero-proof" aria-label="Product capabilities">
        <div className="hero-proof-heading"><span>BUILT FOR DECISIONS</span><span>EXCHANGE.IO / 01</span></div>
        <div className="hero-proof-main">
          <p className="proof-number">166</p>
          <div><strong>currencies, one<br />consistent response.</strong><p>Source, rate date, and freshness metadata travel with every result.</p></div>
        </div>
        <div className="hero-proof-footer"><span>DAILY SNAPSHOTS</span><span>HISTORY SINCE 1999</span><span>NO API KEY</span></div>
      </div>
    </section>

    <section className="source-strip page-width" id="method" aria-label="Service facts">
      <div><span className="eyebrow">SOURCE</span><strong> </strong></div>
      <div><span className="eyebrow">HISTORY</span><strong> ECB archive / 1999 →</strong></div>
      <div><span className="eyebrow">ACCESS</span><strong> JSON / REST / no key</strong></div>
    </section>

    <section className="editorial-grid page-width" id="why">
      <div className="section-label"><span>02</span> WHY THIS EXISTS</div>
      <div className="editorial-copy">
        <p className="section-kicker">THE MISSING LAYER</p>
        <h2>Rates are a record,<br /><em>not a guess.</em></h2>
        <p>Every response carries its source, rate date, and fetch time. Historical endpoints let you answer what a price meant then, not what a cache thinks it means now.</p>
        <div className="timeline" aria-label="Rate history timeline">
          <div><span>01</span><b>FETCH</b><small>source snapshot</small></div>
          <div><span>02</span><b>STORE</b><small>dated reference</small></div>
          <div><span>03</span><b>RETURN</b><small>traceable result</small></div>
        </div>
      </div>
    </section>

    <section className="capability-section page-width">
      <div className="section-label"><span>03</span> ONE API / FOUR USES</div>
      <div className="capability-grid">
        <article><span className="capability-index">01</span><h3>Convert</h3><p>Turn an amount into a useful answer with a single GET request. Cross-rate math stays out of your application.</p><a href="/playground">Try a conversion ↗</a></article>
        <article><span className="capability-index">02</span><h3>Look back</h3><p>Ask what a rate meant on a specific date. Weekend and holiday lookups resolve to the prior available reference.</p><a href="/docs#historical">Read historical docs ↗</a></article>
        <article><span className="capability-index">03</span><h3>Stay current</h3><p>Daily snapshots expose source and fetch timestamps, so your product can show freshness instead of pretending to be live.</p><a href="/docs#latest">See latest endpoint ↗</a></article>
        <article><span className="capability-index">04</span><h3>Explore ahead</h3><p>Statistical forecasts are available as estimates with intervals and model metadata, never disguised as certainty.</p><a href="/docs#forecast">Understand forecasts ↗</a></article>
      </div>
    </section>

    <section className="api-preview page-width" id="api">
      <div className="section-label"><span>04</span> API PREVIEW / ONE REQUEST</div>
      <div className="code-preview">
        <div className="code-heading"><span>GET /api/convert</span><span>200 OK</span></div>
        <pre><code>{`curl "${requestOrigin(c)}/api/convert?from=USD&to=EUR&amount=100"`}</code></pre>
        <p>Built for scripts, prototypes, and products that prefer transparent inputs.</p>
        <a className="text-link" href="/docs">Explore every endpoint <span aria-hidden="true">→</span></a>
      </div>
    </section>

    <section className="data-section page-width">
      <div className="section-label"><span>05</span> DATA YOU CAN EXPLAIN</div>
      <div className="data-layout">
        <div><p className="section-kicker">TRACEABILITY BY DEFAULT</p><h2>Numbers with<br /><em>a paper trail.</em></h2></div>
        <div className="data-copy"><p>Most conversion APIs stop at the number. exchange.io keeps the context attached: where the rate came from, which date it represents, and when it entered the system.</p><div className="data-lines"><div><b>01</b><span>OPEN SOURCE INPUT</span><small>Daily reference rates from .</small></div><div><b>02</b><span>ECB HISTORY</span><small>Long-range archive reaching back to 1999.</small></div><div><b>03</b><span>HONEST FRESHNESS</span><small>Successful snapshot metadata in every response.</small></div></div></div>
      </div>
    </section>

    <section className="closing-section page-width">
      <p className="eyebrow"><span className="live-dot" /> START WITH THE NUMBER YOU NEED</p>
      <h2>Make your first<br /><em>request count.</em></h2>
      <p>Try a live conversion, inspect the raw JSON, then take the request into your own product.</p>
      <a className="button button-primary" href="/playground">Open the playground <span aria-hidden="true">↗</span></a>
    </section>

    <footer className="site-footer page-width">
      <span>exchange.io / reference currency infrastructure</span>
      <a href="/playground">Start with one rate ↗</a>
    </footer>
  </main>,
   { title: 'exchange.io — Currency data without the fog', description: 'Clean currency exchange rates, history, conversion, and forecasts through a small public API.' },
))

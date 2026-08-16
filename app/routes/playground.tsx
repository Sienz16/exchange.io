import { createRoute } from 'honox/factory'
import { requestOrigin } from '../lib/origin'
import Playground from '../islands/playground'

export default createRoute((c) => c.render(
  <main>
    <header className="site-header page-width">
      <a className="wordmark" href="/">exchange<span>.io</span></a>
      <nav aria-label="Page navigation"><a href="/docs">Docs</a><a className="back-link" href="/">← Back to exchange.io</a></nav>
    </header>
    <section className="playground-header page-width">
      <p className="eyebrow">/ PLAYGROUND</p>
      <h1>Make the query.<br /><em>Read the record.</em></h1>
      <p>Test a conversion against the current daily reference snapshot. Every response includes enough metadata to reproduce it.</p>
    </section>
    <Playground origin={requestOrigin(c)} />
  </main>,
   { title: 'Playground — exchange.io', description: 'Test exchange.io currency conversions against the latest reference snapshot.' },
))

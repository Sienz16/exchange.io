import { createRoute } from 'honox/factory'
import { requestOrigin } from '../lib/origin'
import RateTicker from '../islands/rate-ticker'
import ScrollFx from '../islands/scroll-fx'
import ThemeToggle from '../islands/theme-toggle'
import { ArrowLeftRight, ArrowUpRight, History, Activity, TrendingUp, KeyRound } from 'lucide-react'

// Shared utility vocab for this page (Tailwind all the way down).
const page = 'mx-auto w-full max-w-[1200px] px-6'
const em = 'bg-[image:var(--gradient-accent)] bg-clip-text pr-[.06em] font-serif font-normal italic tracking-[-.01em] text-transparent'
const kicker = 'm-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint'
const label = 'flex gap-4 border-b border-line pb-3.5 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-faint [&>span]:text-accent-strong'
const buttonPrimary = 'inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[10px] border border-transparent bg-accent px-6 font-mono text-[.74rem] font-semibold uppercase tracking-[.1em] text-on-accent transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-12px_var(--color-accent)] motion-reduce:transition-none motion-reduce:hover:translate-y-0'
const buttonGhost = 'inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[10px] border border-line2 bg-[color-mix(in_srgb,var(--color-panel)_40%,transparent)] px-6 font-mono text-[.74rem] font-semibold uppercase tracking-[.1em] text-fg transition-colors hover:border-accent-strong hover:text-accent-strong'
const heading2 = 'font-display text-[clamp(2.5rem,4.8vw,4.6rem)] font-bold leading-[.98] tracking-[-.03em]'

export default createRoute((c) => {
  const origin = requestOrigin(c)

  return c.render(
    <><a href="#why" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-accent focus:px-4 focus:py-2">Skip to content</a><main className="overflow-x-clip">
      <header className="sticky top-0 z-50 border-b border-line bg-[var(--header-bg)] backdrop-blur-xl">
        <div className={page + ' flex min-h-16 items-center justify-between'}>
          <a className="font-display text-[1.12rem] font-bold tracking-[-.05em]" href="/">exchange<span className="text-accent-strong">.io</span></a>
          <nav className="flex items-center gap-6 font-mono text-[.7rem] font-medium uppercase tracking-[.1em] text-muted [&>a:hover]:text-accent-strong" aria-label="Primary navigation">
            <a className="hidden sm:inline" href="#why">Why</a>
            <a className="hidden sm:inline" href="#capabilities">Capabilities</a>
            <a className="hidden sm:inline" href="/docs">Docs</a>
            <ThemeToggle />
            <a className="rounded-lg border border-accent-strong/45 px-3.5 py-2.5 text-accent-strong transition-colors hover:bg-accent hover:text-on-accent" href="/playground">Converter <span aria-hidden="true">↗</span></a>
          </nav><details className="relative sm:hidden"><summary className="list-none rounded-lg border border-line px-3 py-2 font-mono text-xs">Menu</summary><nav className="absolute right-0 top-12 z-50 grid min-w-40 gap-3 rounded-lg border border-line bg-panel p-4 font-mono text-xs"><a href="#why">Why</a><a href="#capabilities">Capabilities</a><a href="/docs">Docs</a></nav></details>
        </div>
      </header>

      <section className="relative flex min-h-[calc(100dvh-65px)] items-center overflow-hidden py-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div data-parallax="18" className="absolute -top-[24%] -left-[12%] h-[58vw] max-h-[900px] max-w-[900px] w-[58vw] rounded-full bg-[radial-gradient(circle,var(--color-glow-lime),transparent_62%)] blur-[90px] will-change-transform" />
          <div data-parallax="-14" className="absolute -right-[14%] -bottom-[38%] h-[58vw] max-h-[900px] max-w-[900px] w-[58vw] rounded-full bg-[radial-gradient(circle,var(--color-glow-teal),transparent_62%)] blur-[90px] will-change-transform" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,var(--color-dot)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_85%_75%_at_50%_0%,#000_25%,transparent_78%)]" />
        </div>
        <div className={page + ' relative z-[1]'}>
          <div className="mx-auto flex max-w-[880px] flex-col items-center text-center">
            <p className="mb-7 inline-flex items-center rounded-full border border-line2 bg-[var(--pill-bg)] px-4 py-2 font-mono text-[.64rem] font-medium uppercase tracking-[.16em] text-muted">
              <span className="mr-2.5 inline-block h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_rgba(212,247,79,0.15)]" /> LIVE · DAILY REFERENCE RATES
            </p>
            <h1 className="font-display text-[clamp(3.3rem,8vw,7.2rem)] font-bold leading-[.97] tracking-[-.03em]">Know what<br /><em className={em}>money means.</em></h1>
            <p className="mx-auto mt-7 max-w-[560px] text-[1.06rem] leading-[1.75] text-muted">An open currency API for 30 currencies — daily reference snapshots, history back to 1999, and honest metadata on every number.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3.5">
              <a className={buttonPrimary} href="/playground">Try the converter <span aria-hidden="true">→</span></a>
              <a className={buttonGhost} href="/docs">Read the docs</a>
            </div>
            <p className="mt-6 font-mono text-[.68rem] tracking-[.06em] text-faint">
              <span className="mr-2.5 inline-block w-[26px] border-t border-accent-strong align-[3px]" /> No API key · JSON over HTTPS · free early access
            </p>
          </div>
        </div>
      </section>

      <RateTicker />

      <section className={page + ' grid grid-cols-2 gap-8 py-15 lg:grid-cols-4'} aria-label="Service statistics">
        {[
          ['30', 'currencies tracked'], ['27', 'years of ECB history'], ['6', 'documented endpoints'], ['0', 'API keys required'],
        ].map(([value, name], index) => (
          <div key={name} data-reveal data-reveal-delay={index * 0.08} className={index % 2 === 1 ? 'border-l border-line pl-7.5' : undefined}>
            <strong className="block bg-[image:var(--gradient-accent)] bg-clip-text font-display text-[clamp(2.6rem,4vw,3.8rem)] leading-none font-bold tracking-[-.03em] tabular-nums text-transparent">
              <span data-count={value}>{value}</span>
            </strong>
            <span className="mt-2.5 block font-mono text-[.66rem] font-medium uppercase tracking-[.12em] text-faint">{name}</span>
          </div>
        ))}
      </section>

      <section className={page + ' border-t border-line py-30'} id="why">
        <div className={label}><span>02</span> WHY THIS EXISTS</div>
        <div className="mt-14 grid gap-11 lg:grid-cols-[1.1fr_1fr] lg:gap-[10%]">
          <div data-reveal>
            <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-alt-strong">THE MISSING LAYER</p>
            <h2 className={heading2 + ' mt-3.5'}>Rates are a record,<br /><em className={em}>not a guess.</em></h2>
            <p className="mt-7 max-w-[460px] leading-[1.8] text-muted">Every response carries its source, rate date, and fetch time. Historical endpoints let you answer what a price meant <strong className="text-fg">then</strong> — not what a cache thinks it means now.</p>
          </div>
          <div className="grid grid-cols-1 border-t border-line2 sm:grid-cols-3" aria-label="How a rate reaches you">
            {[
              ['01', 'FETCH', 'Daily snapshot pulled from the open source'],
              ['02', 'STORE', 'Dated reference row, never silently overwritten'],
              ['03', 'RETURN', 'Traceable result with provenance attached'],
            ].map(([step, title, text], index) => (
              <div key={step} data-reveal data-reveal-delay={index * 0.1}
                className="border-b border-line pt-6 pr-5 pb-1 sm:border-b-0 sm:pt-6 [&:not(:last-child)]:sm:border-r sm:[&:not(:last-child)]:pr-5">
                <span className="font-mono text-[.68rem] font-medium text-accent-strong">{step}</span>
                <b className="mt-4.5 block font-mono text-[.8rem] font-semibold uppercase tracking-[.14em] text-fg">{title}</b>
                <small className="mt-2.5 block text-[.78rem] leading-[1.6] text-faint">{text}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={page + ' border-t border-line py-30'} id="capabilities">
        <div className={label}><span>03</span> CAPABILITIES</div>
        <h2 className={heading2 + ' mt-7.5 mb-13'} data-reveal>One API. <em className={em}>Four moves.</em></h2>
        <div className="grid gap-4.5 md:grid-cols-3">
          <article data-reveal className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-[image:var(--card-gradient)] p-7 shadow-[var(--shadow-card)] transition-all duration-250 hover:-translate-y-1 hover:border-accent-strong/40 hover:shadow-[var(--shadow-card-hover)] md:col-span-2">
            <span className="absolute top-6.5 right-6.5 font-mono text-[.64rem] font-medium tracking-[.14em] text-faint">01</span>
            <ArrowLeftRight aria-hidden="true" size={20} strokeWidth={1.6} className="text-accent-strong" />
            <h3 className="font-display text-[1.35rem] font-semibold">Convert</h3>
            <p className="mb-5 text-[.88rem] leading-[1.7] text-muted">Turn an amount into a useful answer with a single GET request. Cross-rate math stays out of your application.</p>
            <div aria-hidden="true" className="mb-5 flex flex-wrap items-center justify-between gap-3.5 rounded-xl border border-dashed border-line2 bg-recess px-5 py-4 font-mono text-[.84rem] max-md:flex-col max-md:items-start">
              <span className="text-muted">🇺🇸 100 USD</span>
              <span className="text-accent-strong">→</span>
              <span className="font-semibold text-fg">🇪🇺 92.16 EUR</span>
            </div>
            <a href="/playground" className="mt-auto inline-flex items-center gap-1.5 font-mono text-[.68rem] font-medium uppercase tracking-[.1em] text-accent-strong [&>svg]:transition-transform hover:[&>svg]:translate-x-0.5 hover:[&>svg]:-translate-y-0.5">Try a conversion <ArrowUpRight aria-hidden="true" size={13} /></a>
          </article>
          <article data-reveal data-reveal-delay="0.08" className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-[image:var(--card-gradient)] p-7 shadow-[var(--shadow-card)] transition-all duration-250 hover:-translate-y-1 hover:border-accent-strong/40 hover:shadow-[var(--shadow-card-hover)]">
            <span className="absolute top-6.5 right-6.5 font-mono text-[.64rem] font-medium tracking-[.14em] text-faint">02</span>
            <History aria-hidden="true" size={20} strokeWidth={1.6} className="text-accent-strong" />
            <h3 className="font-display text-[1.35rem] font-semibold">Look back</h3>
            <p className="mb-5 text-[.88rem] leading-[1.7] text-muted">Ask what a rate meant on a specific date. Weekends and holidays resolve to the prior reference.</p>
            <a href="/docs#semantics" className="mt-auto inline-flex items-center gap-1.5 font-mono text-[.68rem] font-medium uppercase tracking-[.1em] text-accent-strong [&>svg]:transition-transform hover:[&>svg]:translate-x-0.5 hover:[&>svg]:-translate-y-0.5">Date semantics <ArrowUpRight aria-hidden="true" size={13} /></a>
          </article>
          <article data-reveal className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-[image:var(--card-gradient)] p-7 shadow-[var(--shadow-card)] transition-all duration-250 hover:-translate-y-1 hover:border-accent-strong/40 hover:shadow-[var(--shadow-card-hover)]">
            <span className="absolute top-6.5 right-6.5 font-mono text-[.64rem] font-medium tracking-[.14em] text-faint">03</span>
            <Activity aria-hidden="true" size={20} strokeWidth={1.6} className="text-accent-strong" />
            <h3 className="font-display text-[1.35rem] font-semibold">Stay current</h3>
            <p className="mb-5 text-[.88rem] leading-[1.7] text-muted">Daily snapshots expose source and fetch timestamps, so freshness is a fact — not a vibe.</p>
            <a href="/docs#freshness" className="mt-auto inline-flex items-center gap-1.5 font-mono text-[.68rem] font-medium uppercase tracking-[.1em] text-accent-strong [&>svg]:transition-transform hover:[&>svg]:translate-x-0.5 hover:[&>svg]:-translate-y-0.5">See freshness <ArrowUpRight aria-hidden="true" size={13} /></a>
          </article>
          <article data-reveal data-reveal-delay="0.08" className="group relative flex flex-col gap-3 rounded-2xl border border-line bg-[image:var(--card-gradient)] p-7 shadow-[var(--shadow-card)] transition-all duration-250 hover:-translate-y-1 hover:border-accent-strong/40 hover:shadow-[var(--shadow-card-hover)]">
            <span className="absolute top-6.5 right-6.5 font-mono text-[.64rem] font-medium tracking-[.14em] text-faint">04</span>
            <TrendingUp aria-hidden="true" size={20} strokeWidth={1.6} className="text-accent-strong" />
            <h3 className="font-display text-[1.35rem] font-semibold">Explore ahead</h3>
            <p className="mb-5 text-[.88rem] leading-[1.7] text-muted">Statistical forecasts ship as estimates with intervals and model metadata — never disguised as certainty.</p>
            <a href="/docs#forecast" className="mt-auto inline-flex items-center gap-1.5 font-mono text-[.68rem] font-medium uppercase tracking-[.1em] text-accent-strong [&>svg]:transition-transform hover:[&>svg]:translate-x-0.5 hover:[&>svg]:-translate-y-0.5">Understand forecasts <ArrowUpRight aria-hidden="true" size={13} /></a>
          </article>
          <article data-reveal className="flex flex-col items-start gap-6 rounded-2xl border border-line bg-[image:var(--card-gradient)] p-7 shadow-[var(--shadow-card)] transition-all duration-250 hover:-translate-y-1 hover:border-accent-strong/40 hover:shadow-[var(--shadow-card-hover)] md:col-span-3 md:flex-row md:items-center md:gap-6.5">
            <KeyRound aria-hidden="true" size={20} strokeWidth={1.6} className="text-accent-strong" />
            <div className="flex-1">
              <h3 className="mb-2 font-display text-[1.35rem] font-semibold">No key. No signup.</h3>
              <p className="m-0 text-[.88rem] leading-[1.7] text-muted">If you can send an HTTP request, you already have access.</p>
            </div>
            <code className="w-full flex-none overflow-x-auto rounded-[10px] border border-line bg-recess px-4.5 py-3 font-mono text-[.74rem] whitespace-nowrap text-alt-strong md:w-auto md:max-w-[44%]">curl {origin}/api/latest?base=USD</code>
          </article>
        </div>
      </section>

      <section className={page + ' border-t border-line py-30'} id="api">
        <div className={label}><span>04</span> API PREVIEW</div>
        <div className="mt-14 grid items-center gap-11 lg:grid-cols-[1fr_1.2fr] lg:gap-[10%]">
          <div data-reveal>
            <h2 className={heading2}>One request.<br /><em className={em}>Full context.</em></h2>
            <p className="mt-7 max-w-[420px] leading-[1.8] text-muted">Transparent inputs, readable outputs. The response below is exactly what your product receives — amount, rate, provenance and all.</p>
            <a href="/docs" className="mt-8 inline-flex items-center gap-2 border-b border-accent-strong/40 pb-1.5 font-mono text-[.76rem] font-medium tracking-[.06em] text-accent-strong [&>span]:pl-1.5 [&>span]:transition-transform hover:[&>span]:translate-x-1">Explore every endpoint <span aria-hidden="true">→</span></a>
          </div>
          <div data-reveal data-reveal-delay="0.1" className="overflow-hidden rounded-2xl border border-line bg-[#070b14] shadow-[0_40px_110px_-50px_rgba(0,0,0,1)]">
            <div className="flex items-center gap-2 border-b border-line bg-[#0a0e18] px-4.5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-line2" /><span className="h-2.5 w-2.5 rounded-full bg-line2" /><span className="h-2.5 w-2.5 rounded-full bg-line2" />
              <span className="ml-2.5 font-mono text-[.64rem] tracking-[.06em] text-[#66748e]">terminal — exchange.io</span>
            </div>
            <pre className="m-0 overflow-x-auto px-6 py-5.5 font-mono text-[.76rem] leading-[1.75] text-[#eef2fa]"><code>{`curl "${origin}/api/convert?from=USD&to=EUR&amount=100"`}</code></pre>
            <pre className="m-0 overflow-x-auto border-t border-line px-6 py-4.5 font-mono text-[.76rem] leading-[1.75] text-[#a3b0c8]"><code>{`{
  "from": "USD", "to": "EUR", "amount": 100,
  "result": 92.16, "rate": 0.9216,
  "rate_date": "2026-08-16",
  "source": "ecb.europa.eu",
  "fetched_at": "2026-08-16T00:04:12.000Z"
}`}</code></pre>
          </div>
        </div>
      </section>

      <section className={page + ' border-t border-line py-30'}>
        <div className={label}><span>05</span> DATA YOU CAN EXPLAIN</div>
        <div className="mt-14 grid gap-11 lg:grid-cols-[1fr_1.2fr] lg:gap-[10%]">
          <div data-reveal>
            <p className="m-0 font-mono text-[.66rem] font-medium uppercase tracking-[.16em] text-alt-strong">TRACEABILITY BY DEFAULT</p>
            <h2 className={heading2 + ' mt-3.5'}>Numbers with<br /><em className={em}>a paper trail.</em></h2>
          </div>
          <div data-reveal data-reveal-delay="0.1" className="border-t border-line2">
            {[
              ['01', 'OPEN SOURCE INPUT', 'Daily reference rates from the European Central Bank.'],
              ['02', 'ECB HISTORY', 'Long-range archive reaching back to 1999.'],
              ['03', 'HONEST FRESHNESS', 'Snapshot metadata travels with every response.'],
            ].map(([num, title, text]) => (
              <div key={num} className="grid grid-cols-[32px_1fr] gap-x-4 border-b border-line py-5 sm:grid-cols-[40px_1fr_1.2fr]">
                <b className="font-mono text-[.64rem] font-medium tracking-[.12em] text-accent-strong">{num}</b>
                <span className="font-mono text-[.64rem] font-medium tracking-[.12em] text-accent-strong">{title}</span>
                <small className="col-span-2 text-[.8rem] leading-[1.6] text-faint sm:col-span-1">{text}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-line py-37 text-center">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[30%] -top-[40%] h-[80%] bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-accent-strong)_8%,transparent),transparent_65%)]" />
        <div className={page + ' relative'} data-reveal>
          <p className={kicker}><span className="mr-2.5 inline-block h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_rgba(212,247,79,0.15)] align-[1px]" /> START WITH THE NUMBER YOU NEED</p>
          <h2 className={heading2 + ' my-6.5'}>Make your first<br /><em className={em}>request count.</em></h2>
          <p className="mx-auto mb-9 max-w-[460px] leading-[1.75] text-muted">Try a live conversion, inspect the raw JSON, then take the request into your own product.</p>
          <a className={buttonPrimary} href="/playground">Open the playground <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className={page + ' grid gap-11 pb-13 pt-16 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1fr] lg:gap-11'}>
          <div>
            <a className="font-display text-[1.12rem] font-bold tracking-[-.05em]" href="/">exchange<span className="text-accent-strong">.io</span></a>
            <p className="mt-4 text-[.82rem] leading-[1.75] text-faint">Reference currency infrastructure.<br />ECB rates · ECB history · honest metadata.</p>
          </div>
          {[
            ['Product', [['Converter', '/playground'], ['Documentation', '/docs'], ['API preview', '/#api']]],
            ['Endpoints', [['Latest', '/docs#endpoints'], ['Convert', '/docs#endpoints'], ['Historical', '/docs#endpoints'], ['Forecast', '/docs#endpoints']]],
          ].map(([title, links]) => (
            <nav key={title as string} className="flex flex-col items-start gap-2.5" aria-label={title as string}>
              <span className="mb-1.5 font-mono text-[.62rem] font-medium uppercase tracking-[.16em] text-faint">{title as string}</span>
              {(links as Array<[string, string]>).map(([name, href]) => (
                <a key={name} href={href} className="text-[.84rem] text-muted transition-colors hover:text-accent-strong">{name}</a>
              ))}
            </nav>
          ))}
          <div className="flex flex-col items-start gap-2.5">
            <span className="mb-1.5 font-mono text-[.62rem] font-medium uppercase tracking-[.16em] text-faint">SOURCE</span>
              <a href="https://www.ecb.europa.eu/services/disclaimer/html/index.en.html" rel="noopener noreferrer" target="_blank" className="text-[.84rem] text-muted transition-colors hover:text-accent-strong">ECB source and terms ↗</a>
            <a href="/api/health" className="text-[.84rem] text-muted transition-colors hover:text-accent-strong">/api/health</a>
          </div>
        </div>
        <div className={page + ' flex flex-wrap justify-between gap-3 border-t border-line py-5.5 pb-7.5 font-mono text-[.66rem] text-faint'}>
          <span>© 2026 exchange.io — reference currency infrastructure</span>
          <span>No warranty on rates · not financial advice</span>
        </div>
      </footer>

      <ScrollFx />
    </main></>,
    { title: 'exchange.io — Know what money means', description: 'Clean currency exchange rates, history, conversion, and forecasts through a small public API. 30 currencies, no API key.' },
  )
})

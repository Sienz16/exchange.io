import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react'
import { ArrowDownUp, Check, ChevronDown, Loader2, Search } from 'lucide-react'
import { metaFor, symbolFor } from '../lib/currency-meta'
import { cn } from '../lib/utils'

type Conversion = {
  from: string; to: string; amount: number; result: number; rate: number
  rate_date: string; source: string; fetched_at: string
}
type Endpoint = 'convert' | 'latest' | 'historical' | 'timeseries' | 'fluctuation' | 'batch-convert'

const fallbackCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'SGD', 'VND']
const zeroDecimal = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'])
const precisionOptions = [0, 2, 3, 4, 6]
const popularPairs = [
  ['USD', 'EUR'], ['EUR', 'USD'], ['USD', 'JPY'], ['GBP', 'EUR'], ['USD', 'VND'], ['EUR', 'PLN'],
] as const

const fieldRow = 'flex items-center gap-3.5 border-b border-line py-[15px]'
const fieldLabel = 'w-[74px] flex-none font-mono text-[.62rem] font-medium uppercase tracking-[.14em] text-faint'
const monoMeta = 'font-mono text-[.72rem]'

function formatAmount(value: number, precision: number) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: precision, maximumFractionDigits: precision,
  }).format(value)
}

export default function Playground({ compact = false, origin = '' }: { compact?: boolean; origin?: string }) {
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('EUR')
  const [date, setDate] = useState('')
  const [endpoint, setEndpoint] = useState<Endpoint>('convert')
  const [data, setData] = useState<Conversion | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
  const [currencies, setCurrencies] = useState(fallbackCurrencies)
  const [decimals, setDecimals] = useState<number | null>(null)
  const [swapped, setSwapped] = useState(false)
  const id = (name: string) => (compact ? `compact-${name}` : name)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFrom(params.get('from')?.toUpperCase() || 'USD')
    setTo(params.get('to')?.toUpperCase() || 'EUR')
    setAmount(params.get('amount') || '100')
    setDate(params.get('date') || '')
    fetch('/api/currencies').then((response) => response.json() as Promise<{ currencies?: Array<{ code: string; decimals: number }> }>).then((body) => {
      if (body.currencies?.length) setCurrencies(body.currencies.map(({ code }) => code))
    }).catch(() => undefined)
    const saved = window.localStorage.getItem('exchangeio-decimals')
    if (saved != null && precisionOptions.includes(Number(saved))) setDecimals(Number(saved))
  }, [])

  const effectiveDecimals = decimals ?? (zeroDecimal.has(to) ? 0 : 2)
  const siteOrigin = origin || (typeof window === 'undefined' ? '' : window.location.origin)
  const curl = `curl "${siteOrigin}/api/convert?from=${from}&to=${to}&amount=${amount || '0'}"`

  useEffect(() => {
    const params = new URLSearchParams({ from, to, amount })
    if (date) params.set('date', date)
    window.history.replaceState(null, '', `${window.location.pathname}?${params}`)
  }, [from, to, amount, date])

  async function convert() {
    setBusy(true); setError('')
    try {
      const dateParam = date ? `&date=${encodeURIComponent(date)}` : ''
      const path = endpoint === 'convert' ? `/api/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}${dateParam}` : endpoint === 'latest' ? `/api/latest?base=${from}` : endpoint === 'historical' ? `/api/historical?date=${encodeURIComponent(date || '2024-01-01')}&base=${from}` : endpoint === 'batch-convert' ? `/api/batch-convert?from=${from}&to=${to},GBP,JPY&amount=${amount}` : endpoint === 'timeseries' ? `/api/timeseries?start=${encodeURIComponent(date || '2024-01-01')}&end=${encodeURIComponent(date || '2024-01-31')}&base=${from}` : `/api/fluctuation?start=${encodeURIComponent(date || '2024-01-01')}&end=${encodeURIComponent(date || '2024-01-31')}&base=${from}`
      const response = await fetch(path)
      const body = await response.json() as Conversion & { message?: string }
      if (!response.ok) throw new Error(body.message || 'Conversion unavailable')
      setData(body)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Conversion unavailable')
    } finally {
      setBusy(false)
    }
  }

  async function copy(value: string, name: string) {
    await navigator.clipboard.writeText(value); setCopied(name)
    window.setTimeout(() => setCopied(''), 1800)
  }

  function swap() {
    setFrom(to); setTo(from); setSwapped((v) => !v)
  }

  function chooseDecimals(value: number) {
    setDecimals(value)
    window.localStorage.setItem('exchangeio-decimals', String(value))
  }

  // First conversion runs as soon as the instrument mounts; after that, any
  // pair change re-queries, and amount edits re-query on a debounce.
  const ranFirst = useRef(false)
  useEffect(() => {
    convert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])
  useEffect(() => {
    if (!ranFirst.current) { ranFirst.current = true; return }
    const timer = window.setTimeout(convert, 700)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount])

  return <div className={cn(
    'rounded-2xl border border-line bg-[image:var(--panel-gradient)] shadow-[var(--shadow-instrument)]',
    compact ? 'block' : 'mx-auto max-w-[1140px]',
  )}>
    <div className={cn(compact ? 'block' : 'grid md:grid-cols-[minmax(320px,400px)_1fr]')}>
      <div className="flex flex-col border-b border-line p-5 md:border-b-0 md:border-r md:p-[30px]">
        <div className={cn(fieldRow, 'focus-within:border-accent-strong')}>
          <label htmlFor={id('amount')} className={fieldLabel}>AMOUNT</label>
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="font-mono text-[1.05rem] text-faint" aria-hidden="true">{symbolFor(from) ?? from}</span>
            <input id={id('amount')} inputMode="decimal" autoComplete="off" value={amount}
              onChange={(event) => setAmount(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && convert()}
              aria-describedby={id('amount-help')}
              className="w-full min-w-0 border-0 bg-transparent font-mono text-[1.55rem] font-medium tracking-[-.02em] tabular-nums text-fg placeholder:text-faint" />
          </div>
          <span className="flex-none rounded-md border border-line px-[9px] py-1 font-mono text-[.66rem] font-medium text-faint">{from}</span>
        </div>
        <div className="flex flex-col">
          <div className={cn(fieldRow, 'relative')}>
            <span className={fieldLabel}>FROM</span>
            <CurrencyPicker id={id('from')} value={from} currencies={currencies} onChange={setFrom} />
          </div>
          <button type="button" onClick={swap} aria-label={`Swap ${from} and ${to}`}
            className="relative z-[2] mb-[-18px] mt-[-18px] mr-[2px] flex h-9 w-9 self-end items-center justify-center rounded-full border border-line2 bg-recess text-muted transition-colors hover:border-accent-strong hover:text-accent-strong">
            <motion.span animate={{ rotate: swapped ? 180 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
              <ArrowDownUp aria-hidden="true" size={15} strokeWidth={2} />
            </motion.span>
          </button>
          <div className={cn(fieldRow, 'relative')}>
            <span className={fieldLabel}>TO</span>
            <CurrencyPicker id={id('to')} value={to} currencies={currencies} onChange={setTo} />
          </div>
        </div>
         <label htmlFor={id('date')} className="mt-4 font-mono text-[.62rem] uppercase tracking-[.14em] text-faint">Historical date (optional)</label>
         <input id={id('date')} type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 rounded-lg border border-line bg-recess px-3 py-2 font-mono text-[.72rem] text-fg" />
         <p id={id('amount-help')} className="mt-3.5 font-mono text-[.62rem] tracking-[.04em] text-faint">Daily reference snapshot · updates as you type</p>
       <label htmlFor={id('endpoint')} className="mt-4 font-mono text-[.62rem] uppercase tracking-[.14em] text-faint">Endpoint</label>
       <select id={id('endpoint')} value={endpoint} onChange={(event) => setEndpoint(event.target.value as Endpoint)} className="mt-2 rounded-lg border border-line bg-recess px-3 py-2 font-mono text-[.72rem] text-fg"><option value="convert">Convert</option><option value="latest">Latest</option><option value="historical">Historical</option><option value="timeseries">Timeseries</option><option value="fluctuation">Fluctuation</option><option value="batch-convert">Batch convert</option></select>
       <button type="button" onClick={convert} disabled={busy}
          className="mt-[22px] flex w-full items-center justify-center gap-2.5 rounded-[10px] bg-accent px-[18px] py-[15px] font-mono text-[.76rem] font-semibold uppercase tracking-[.1em] text-on-accent transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_-14px_var(--color-accent)] disabled:cursor-wait disabled:opacity-55 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
          {busy ? <Loader2 className="animate-spin" aria-hidden="true" size={15} /> : null}
          {busy ? 'Converting' : 'Convert'} <span aria-hidden="true">→</span>
        </button>
        {error && <p role="alert" className="mt-3.5 font-mono text-[.72rem] text-danger">{error}</p>}
        {!compact && <div className="mt-[22px] flex flex-wrap gap-2" aria-label="Popular pairs">
          {popularPairs.map(([a, b]) => (
            <button key={`${a}-${b}`} type="button" aria-pressed={a === from && b === to}
              onClick={() => { setFrom(a); setTo(b) }}
              className={cn('inline-flex items-center gap-1.5 rounded-lg border px-[11px] py-2 font-mono text-[.68rem] font-medium transition-colors',
                a === from && b === to ? 'border-accent-strong/50 bg-accent/10 text-accent-strong' : 'border-line text-muted hover:border-accent-strong/50 hover:text-accent-strong')}>
              <span aria-hidden="true">{metaFor(a).flag}</span>{a}<span aria-hidden="true" className="text-faint">→</span><span aria-hidden="true">{metaFor(b).flag}</span>{b}
            </button>
          ))}
        </div>}
      </div>

      <div className="flex min-w-0 flex-col p-5 md:p-[30px]" aria-live="polite">
        <div className="flex items-center font-mono text-[.62rem] font-medium uppercase tracking-[.16em] text-accent-strong">
          <span className="mr-2.5 inline-block h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_rgba(212,247,79,0.15)]" />
          {data ? 'LIVE RESULT' : 'AWAITING QUERY'}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={data ? `${data.from}-${data.to}-${data.rate_date}` : 'empty'}
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.28, ease: 'easeOut' }}
            className="mt-[22px]">
            {data
              ? <>
                <div className="flex flex-wrap items-baseline gap-3.5 font-display text-[clamp(2.5rem,4.4vw,3.9rem)] font-bold leading-none tracking-[-.02em] tabular-nums">
                  <AnimatedNumber value={data.result} decimals={effectiveDecimals} />
                  <span className="inline-flex items-center gap-2 font-mono text-[.95rem] font-semibold tracking-[.04em] text-accent-strong">
                    <span aria-hidden="true">{metaFor(data.to).flag}</span> {data.to}
                  </span>
                </div>
                <div className="mt-[22px] flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[.6rem] font-medium tracking-[.14em] text-faint">DECIMALS</span>
                  <div className="flex gap-1.5" role="group" aria-label="Result decimal places">
                    {precisionOptions.map((option) => (
                      <button key={option} type="button" aria-pressed={effectiveDecimals === option} onClick={() => chooseDecimals(option)}
                        className={cn('min-w-[38px] rounded-lg border px-2.5 py-1.5 font-mono text-[.7rem] font-medium transition-colors',
                          effectiveDecimals === option ? 'border-accent bg-accent font-semibold text-on-accent' : 'border-line text-muted hover:border-accent-strong/50 hover:text-accent-strong')}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="mt-5 font-mono text-[.78rem] tabular-nums text-muted">
                  1 {data.from} = <strong className="font-semibold text-fg">{data.rate.toFixed(6)}</strong> {data.to}
                  <span className="text-faint"> · 1 {data.to} = {(1 / data.rate).toFixed(6)} {data.from}</span>
                </p>
              </>
              : <div className="font-display text-[clamp(2.5rem,4.4vw,3.9rem)] font-bold leading-none tracking-[-.02em] text-faint">—</div>}
          </motion.div>
        </AnimatePresence>
        <dl className="mt-7 grid grid-cols-3 gap-3.5">
          <div className="border-t border-line pt-3">
            <dt className="font-mono text-[.58rem] font-medium uppercase tracking-[.14em] text-faint">RATE DATE</dt>
            <dd className={cn(monoMeta, 'mt-1.5 text-muted')}>{data?.rate_date || 'Awaiting query'}</dd>
          </div>
          <div className="border-t border-line pt-3">
            <dt className="font-mono text-[.58rem] font-medium uppercase tracking-[.14em] text-faint">SOURCE</dt>
            <dd className={cn(monoMeta, 'mt-1.5 break-anywhere text-muted')}>{data?.source || '—'}</dd>
          </div>
          <div className="border-t border-line pt-3">
            <dt className="font-mono text-[.58rem] font-medium uppercase tracking-[.14em] text-faint">FETCHED</dt>
            <dd className={cn(monoMeta, 'mt-1.5 tabular-nums text-muted')}>{data ? new Date(data.fetched_at).toLocaleString() : '—'}</dd>
          </div>
        </dl>
      </div>
    </div>

    {!compact && <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 md:px-[30px] md:pb-[30px]">
      <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-[#070b14]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 font-mono text-[.62rem] font-medium uppercase tracking-[.14em] text-faint">
          <span>RESPONSE / JSON</span>
          <button type="button" onClick={() => data && copy(JSON.stringify(data, null, 2), 'json')} disabled={!data}
            className="flex-none font-mono text-[.66rem] font-medium text-accent-strong disabled:cursor-not-allowed disabled:text-faint">
            {copied === 'json' ? 'Copied ✓' : 'Copy JSON'}
          </button>
        </div>
        <pre className="m-0 overflow-x-auto p-4 font-mono text-[.7rem] leading-[1.75] text-[#a3b0c8]"><code>{data ? JSON.stringify(data, null, 2) : '// run a conversion to see the raw response'}</code></pre>
      </div>
      <div className="min-w-0 overflow-hidden rounded-xl border border-line bg-[#070b14]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 font-mono text-[.62rem] font-medium uppercase tracking-[.14em] text-faint">
          <span>REQUEST / CURL</span>
          <button type="button" onClick={() => copy(curl, 'curl')} className="flex-none font-mono text-[.66rem] font-medium text-accent-strong">
            {copied === 'curl' ? 'Copied ✓' : 'Copy curl'}
          </button>
        </div>
        <pre className="m-0 overflow-x-auto p-4 font-mono text-[.7rem] leading-[1.75] text-[#a3b0c8]"><code>{curl}</code></pre>
        <p role="status" className="m-0 min-h-[1em] px-4 pb-3 font-mono text-[.64rem] text-accent-strong">{copied ? `${copied} copied to clipboard` : ''}</p>
      </div>
    </div>}
  </div>
}

function AnimatedNumber({ value, decimals }: { value: number; decimals: number }) {
  const current = useMotionValue(value)
  const text = useTransform(current, (latest) => formatAmount(latest, decimals))
  const initial = useRef(true)

  useEffect(() => {
    if (initial.current) { initial.current = false; current.set(value); return }
    const controls = animate(current, value, { duration: 0.6, ease: [0.16, 1, 0.3, 1] })
    return () => controls.stop()
  }, [value, current])

  return <motion.span>{text}</motion.span>
}

function matches(code: string, meta: { name: string; country: string }, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return code.toLowerCase().includes(q) || meta.name.toLowerCase().includes(q) || meta.country.toLowerCase().includes(q)
}

function CurrencyPicker({ id, value, currencies, onChange }: { id: string; value: string; currencies: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlight, setHighlight] = useState(0)
  const selected = metaFor(value)

  const filtered = useMemo(
    () => currencies.filter((code) => matches(code, metaFor(code), search)),
    [currencies, search],
  )

  useEffect(() => { setHighlight(0) }, [search])
  useEffect(() => { if (!open) setSearch('') }, [open])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(`[data-currency-picker="${id}"]`)) setOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [id, open])

  function pick(code: string) { onChange(code); setOpen(false) }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (event.key === 'Escape') { setOpen(false); return }
    if (event.key === 'ArrowDown') { event.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
    if (event.key === 'Enter' && filtered[highlight]) { event.preventDefault(); pick(filtered[highlight]) }
  }

  return <div className="relative min-w-0 flex-1" data-currency-picker={id}>
    <button id={id} type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}
      className="group flex w-full items-center justify-between gap-2.5 border-0 bg-transparent py-1.5 text-left text-fg">
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="text-[1.35rem] leading-none" aria-hidden="true">{selected.flag}</span>
        <span className="font-display text-[1.1rem] font-semibold tracking-[-.01em] group-hover:text-accent-strong">{value}</span>
        <span className="hidden min-w-0 truncate font-mono text-[.62rem] tracking-[.02em] text-faint sm:inline">{selected.name} · {selected.country}</span>
      </span>
      <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }} className="flex text-faint">
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
      </motion.span>
    </button>
    <AnimatePresence>
      {open && (
        <motion.div role="dialog" aria-label={`Choose ${id.startsWith('from') ? 'source' : 'target'} currency`}
          initial={{ opacity: 0, y: -6, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.985 }} transition={{ duration: 0.16, ease: 'easeOut' }}
          className="absolute left-0 top-[calc(100%+8px)] z-40 w-[min(330px,calc(100vw-48px))] overflow-hidden rounded-xl border border-line2 bg-[var(--menu-bg)] shadow-[var(--shadow-menu)]">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2.5 text-faint focus-within:border-accent-strong focus-within:text-accent-strong">
            <Search aria-hidden="true" size={14} />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={onKeyDown}
              placeholder="Search currency or country" aria-label="Search currencies"
              className="min-w-0 flex-1 border-0 bg-transparent font-mono text-[.74rem] text-fg outline-0 placeholder:text-faint" />
          </div>
          <div role="listbox" aria-label="Currencies" onKeyDown={onKeyDown}
            className="max-h-[290px] overflow-y-auto p-1.5 [scrollbar-color:var(--color-line2)_transparent]">
            {filtered.length ? filtered.map((code, index) => {
              const meta = metaFor(code)
              return <button key={code} id={`${id}-option-${code}`} type="button" role="option" aria-selected={code === value}
                data-highlighted={index === highlight || undefined} onMouseEnter={() => setHighlight(index)} onClick={() => pick(code)}
                className={cn('flex w-full items-center gap-2.5 rounded-lg border-0 px-2.5 py-2 text-left transition-colors',
                  code === value ? 'bg-recess text-accent-strong shadow-[inset_2px_0_var(--color-accent-strong)]'
                    : index === highlight ? 'bg-recess text-fg' : 'bg-transparent text-muted hover:bg-recess hover:text-fg')}>
                <span className="text-[1.2rem] leading-none" aria-hidden="true">{meta.flag}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="font-display text-[.84rem] font-semibold">{code}</b>
                  <small className="truncate font-mono text-[.6rem] text-faint">{meta.name} · {meta.country}</small>
                </span>
                {code === value && <Check aria-hidden="true" size={15} className="text-accent-strong" />}
              </button>
            }) : <p className="m-0 p-4 font-mono text-[.7rem] text-faint">No matching currency.</p>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
}

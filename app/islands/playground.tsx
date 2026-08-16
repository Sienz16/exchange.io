import { useEffect, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

type Conversion = {
  from: string; to: string; amount: number; result: number; rate: number
  rate_date: string; source: string; fetched_at: string
}

const fallbackCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'SGD', 'VND']

export default function Playground({ compact = false }: { compact?: boolean }) {
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('EUR')
  const [data, setData] = useState<Conversion | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
  const [currencies, setCurrencies] = useState(fallbackCurrencies)

  useEffect(() => {
    fetch('/api/currencies').then((response) => response.json() as Promise<{ currencies?: Array<{ code: string }> }>).then((body) => {
      if (body.currencies?.length) setCurrencies(body.currencies.map(({ code }) => code))
    }).catch(() => undefined)
  }, [])
  const curl = `curl "${typeof window === 'undefined' ? 'https://exchange.io' : window.location.origin}/api/convert?from=${from}&to=${to}&amount=${amount || '0'}"`

  async function convert() {
    setBusy(true); setError('')
    try {
      const response = await fetch(`/api/convert?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`)
      const body = await response.json() as Conversion & { message?: string }
      if (!response.ok) throw new Error(body.message || 'Conversion unavailable')
      setData(body)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Conversion unavailable')
    } finally { setBusy(false) }
  }

  async function copy(value: string, name: string) {
    await navigator.clipboard.writeText(value); setCopied(name)
    window.setTimeout(() => setCopied(''), 1800)
  }

  const display = data ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(data.result) : '—'
  return <div className={compact ? 'instrument compact-instrument' : 'playground-grid page-width'}>
    <div className="control-rail">
      <div className="field-row">
        <label htmlFor={compact ? 'compact-amount' : 'amount'}>AMOUNT</label>
        <input id={compact ? 'compact-amount' : 'amount'} inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} aria-describedby="amount-help" />
      </div>
      <div className="field-row currency-field"><span className="field-label">FROM</span><CurrencyPicker id={compact ? 'compact-from' : 'from'} value={from} currencies={currencies} onChange={setFrom} /></div>
      <div className="swap-mark" aria-hidden="true">↓</div>
      <div className="field-row currency-field"><span className="field-label">TO</span><CurrencyPicker id={compact ? 'compact-to' : 'to'} value={to} currencies={currencies} onChange={setTo} /></div>
      <p id="amount-help" className="field-help">Decimal amount. Current daily reference.</p>
      <button className="primary-button" type="button" onClick={convert} disabled={busy}>{busy ? 'Reading…' : 'Convert'} <span aria-hidden="true">→</span></button>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
    <div className="result-panel" aria-live="polite">
      <div className="result-kicker"><span className="live-dot" /> RESULT / {data ? 'CURRENT' : 'READY'}</div>
      <div className="result-value"><span>{display}</span> <small>{to}</small></div>
      <p className="rate-line">1 {from} = {data ? data.rate.toFixed(6) : '—'} {to}</p>
      <dl className="metadata">
        <div><dt>RATE DATE</dt><dd>{data?.rate_date || 'Awaiting query'}</dd></div>
        <div><dt>SOURCE</dt><dd>{data?.source || '—'}</dd></div>
        <div><dt>FETCHED</dt><dd>{data ? new Date(data.fetched_at).toLocaleString() : '—'}</dd></div>
      </dl>
    </div>
    {!compact && <div className="response-panel">
      <div className="response-heading"><span>RESPONSE</span><button type="button" onClick={() => data && copy(JSON.stringify(data, null, 2), 'json')} disabled={!data}>{copied === 'json' ? 'Copied' : 'Copy JSON'}</button></div>
      <pre className="json-block"><code>{data ? JSON.stringify(data, null, 2) : '{\n  "result": null\n}'}</code></pre>
      <div className="response-heading"><span>CURL</span><button type="button" onClick={() => copy(curl, 'curl')}>{copied === 'curl' ? 'Copied' : 'Copy curl'}</button></div>
      <pre className="curl-block"><code>{curl}</code></pre>
      <p className="copy-status" role="status">{copied ? `${copied} copied to clipboard` : ''}</p>
    </div>}
  </div>
}

function CurrencyPicker({ id, value, currencies, onChange }: { id: string; value: string; currencies: string[]; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const filtered = currencies.filter((code) => code.toLowerCase().includes(search.trim().toLowerCase()))

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(`[data-currency-picker="${id}"]`)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('click', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('click', close); document.removeEventListener('keydown', escape) }
  }, [id, open])

  return <div className="currency-picker" data-currency-picker={id}>
    <button id={id} className="currency-trigger" type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{value}</span><ChevronDown aria-hidden="true" size={17} strokeWidth={1.8} />
    </button>
    {open && <div className="currency-menu" role="dialog" aria-label={`Choose ${id === 'from' || id === 'compact-from' ? 'source' : 'target'} currency`}>
      <div className="currency-search"><Search aria-hidden="true" size={15} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search currency" aria-label="Search currencies" /></div>
      <div className="currency-options" role="listbox" aria-label="Currencies">
        {filtered.length ? filtered.map((code) => <button key={code} className="currency-option" type="button" role="option" aria-selected={code === value} onClick={() => { onChange(code); setOpen(false) }}><span>{code}</span>{code === value && <Check aria-hidden="true" size={16} />}</button>) : <p className="currency-empty">No matching currency.</p>}
      </div>
    </div>}
  </div>
}

import { useState } from 'react'

type Conversion = {
  from: string; to: string; amount: number; result: number; rate: number
  rate_date: string; source: string; fetched_at: string
}

const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'INR', 'SGD', 'VND']

export default function Playground({ compact = false }: { compact?: boolean }) {
  const [amount, setAmount] = useState('100')
  const [from, setFrom] = useState('USD')
  const [to, setTo] = useState('EUR')
  const [data, setData] = useState<Conversion | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState('')
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
      <div className="field-row"><label htmlFor={compact ? 'compact-from' : 'from'}>FROM</label><select id={compact ? 'compact-from' : 'from'} value={from} onChange={(event) => setFrom(event.target.value)}>{currencies.map((code) => <option key={code}>{code}</option>)}</select></div>
      <div className="swap-mark" aria-hidden="true">↓</div>
      <div className="field-row"><label htmlFor={compact ? 'compact-to' : 'to'}>TO</label><select id={compact ? 'compact-to' : 'to'} value={to} onChange={(event) => setTo(event.target.value)}>{currencies.map((code) => <option key={code}>{code}</option>)}</select></div>
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

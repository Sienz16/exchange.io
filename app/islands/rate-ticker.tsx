import { useEffect, useState } from 'react'
import { metaFor } from '../lib/currency-meta'

type TickerItem = { code: string; rate: number }

const preferred = ['EUR', 'JPY', 'GBP', 'CHF', 'CAD', 'AUD', 'CNY', 'HKD', 'SGD', 'INR', 'KRW', 'VND', 'THB', 'IDR', 'MYR', 'PHP', 'BRL', 'MXN', 'ZAR', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'TRY', 'AED', 'SAR', 'ILS', 'EGP', 'NGN', 'KES', 'ARS', 'CLP', 'COP', 'NZD', 'TWD', 'RON']

const fallbackRates: Record<string, number> = {
  EUR: 0.9216, JPY: 147.32, GBP: 0.7871, CHF: 0.8812, CAD: 1.3705, AUD: 1.5238, CNY: 7.1642, HKD: 7.8104,
  SGD: 1.3127, INR: 83.947, KRW: 1332.5, VND: 25415, THB: 34.271, IDR: 15812, MYR: 4.4692, PHP: 57.312,
  BRL: 5.5138, MXN: 18.273, ZAR: 18.324, SEK: 10.512, NOK: 10.773, DKK: 6.8741, PLN: 3.9612, CZK: 23.108,
  HUF: 356.24, TRY: 34.215, AED: 3.6725, SAR: 3.75, ILS: 3.7284, EGP: 48.612, NGN: 1582.4, KES: 129.32,
  ARS: 942.5, CLP: 942.31, COP: 4021.6, NZD: 1.6632, TWD: 32.412, RON: 4.5712,
}

const fallbackItems = preferred.map((code) => ({ code, rate: fallbackRates[code] ?? 1 }))

export default function RateTicker() {
  const [items, setItems] = useState<TickerItem[]>(fallbackItems)
  const [rateDate, setRateDate] = useState('')

  useEffect(() => {
    fetch('/api/latest?base=USD').then((response) => response.json() as Promise<{ base?: string; rates?: Record<string, number>; rate_date?: string }>).then((body) => {
      if (body.rates) {
        setItems(preferred.filter((code) => typeof body.rates?.[code] === 'number').map((code) => ({ code, rate: body.rates![code] })))
        if (body.rate_date) setRateDate(body.rate_date)
      }
    }).catch(() => undefined)
  }, [])

  const row = (ariaHidden: boolean) => <ul className="m-0 flex w-max list-none p-0 pl-[26px]" aria-hidden={ariaHidden || undefined}>
    {items.map(({ code, rate }) => <li key={code} title={`1 USD = ${rate} ${code}`}
      className="flex items-center gap-2.5 whitespace-nowrap px-[26px] font-mono text-[.76rem] after:ml-[26px] after:h-1 after:w-1 after:rounded-full after:bg-line2 after:content-['']">
      <span className="text-base" aria-hidden="true">{metaFor(code).flag}</span>
      <span className="text-muted">{code}</span>
      <span className="tabular-nums">{rate >= 100 ? rate.toFixed(1) : rate.toFixed(4)}</span>
    </li>)}
  </ul>

  return <div role="region" aria-label="Reference exchange rates against the US dollar"
    className="group flex items-stretch overflow-hidden border-y border-line bg-panel">
    <span className="flex flex-none items-center bg-recess px-[22px] font-mono text-[.68rem] font-medium uppercase tracking-[.12em] text-accent-strong">
      <span className="mr-2.5 inline-block h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_rgba(212,247,79,0.15)]" /> 1 USD =
    </span>
    <div className="flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_95%,transparent)]">
      <div className="flex w-max animate-ticker group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        {row(false)}
        {row(true)}
      </div>
    </div>
    {rateDate && <span className="hidden items-center border-l border-line px-[18px] font-mono text-[.62rem] text-faint md:flex">{rateDate}</span>}
  </div>
}

# exchange.io API and Product Design

## Goal

Create an owned currency reference-rate service with current, historical, and later forecast capabilities, plus a public landing page, playground, and documentation. The service replaces the existing converter's dependency on Frankfurter.

## Scope

### Included

- `GET /api/health`
- `GET /api/latest?base=USD`
- `GET /api/convert?from=USD&to=EUR&amount=100&date=YYYY-MM-DD`
- `GET /api/historical?date=YYYY-MM-DD&base=USD`
- `GET /api/currencies`
- Forecast contract and baseline implementation after historical data works: `GET /api/forecast?from=USD&to=EUR&horizon=7`
- Postgres persistence, ECB historical seed, daily source refresh, stale-data fallback.
- Responsive landing, playground, and docs.

### Deferred

Accounts, API keys, billing, crypto, trading data, ML models, and deployment changes.

## Semantics

`latest` means most recent successful available snapshot. `historical` accepts ISO dates. Future dates return `422`. For weekends and market holidays, lookup may use the latest prior available date and must return that actual `rate_date`. `convert` uses latest unless `date` is supplied.

Forecast is separate from factual rates. Initial model is transparent statistical baseline using stored history, limited to 1-30 days. Responses include estimate, lower and upper interval, model version, training date, horizon, and disclaimer. Forecast is not a guarantee or financial advice.

## Architecture

- HonoX routes validate query parameters, call services, and serialize JSON.
- `app/lib/validation.ts` owns shared zod schemas.
- `app/lib/rates.ts` owns lookup, cross-rate conversion, cache, and metadata.
- `app/lib/db.ts` owns Postgres access.
- `app/lib/sources/` owns external source adapters.
- `app/lib/jobs/` owns ingestion and forecast jobs.
- React islands own interactive playground behavior only.

Database stores normalized `daily_rates(date, base, currency, rate)` with unique `(date, base, currency)` and lookup indexes. `rate_updates` records source, fetch time, status, and errors. All timestamps are UTC.

## Error and Reliability Behavior

Validate dates, supported currencies, positive finite amounts, and forecast horizons at the HTTP boundary. Errors use `{ error, message, details }`. Source failures preserve last successful data; responses expose source and freshness metadata. CORS is enabled for public browser clients. Basic rate limiting is required before public launch.

## Testing and Verification

Non-trivial rate math, date resolution, validation, and forecast baseline each need a focused runnable check. Required verification: `bunx tsc --noEmit`, `bun run build`, and route checks against the dev server.

## Design Direction

Use technical editorial styling documented in root `design.md`: warm off-white canvas, deep ink, cobalt signal blue, restrained lime freshness indicator, display heading typography, system UI text, and monospace code/rates. Prefer asymmetric whitespace and thin rules. Avoid generic SaaS cards, decorative gradients, glassmorphism, fake metrics, and stock imagery. Preserve semantic HTML, keyboard access, visible focus, contrast, responsive behavior, and reduced-motion support.

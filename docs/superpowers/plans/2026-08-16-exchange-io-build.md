# exchange.io Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship exchange.io as a documented daily and historical currency API with a usable landing page, playground, docs, and a recorded then validated statistical forecast feature.

**Architecture:** Keep HonoX routes thin. Shared zod schemas validate HTTP input; rate services own lookup, conversion, cache, and metadata; Postgres and source adapters own persistence and ingestion. React islands handle only interactive UI.

**Tech Stack:** HonoX, Hono, React 19, Tailwind v4, shadcn/ui, lucide-react, Bun, Postgres via `postgres`, zod.

## Global Constraints

- Future factual rates do not exist; historical endpoints return HTTP `422` for future dates.
- Forecasts are estimates, never trading signals or guarantees.
- Use `c.json()` for API handlers and zod at every request boundary.
- Store UTC timestamps and ISO `YYYY-MM-DD` rate dates.
- Enforce unique `(date, base, currency)` rows.
- Preserve source, fetched time, and actual `rate_date` in responses.
- Do not add dependencies unless existing packages cannot solve the need.
- Use technical editorial visual language from root `design.md`.
- Verify with `bunx tsc --noEmit` and `bun run build`.

## File Map

- `app/lib/validation.ts`: shared request schemas and validation errors.
- `app/lib/types.ts`: API and rate domain types.
- `app/lib/rates.ts`: source-independent lookup, conversion, cache, metadata.
- `app/lib/sources/er-api.ts`: open.er-api.com adapter.
- `app/lib/db.ts`: Postgres connection and rate queries.
- `app/lib/schema.sql`: database tables and indexes.
- `app/lib/jobs/fetch-rates.ts`: daily upsert job.
- `scripts/seed-ecb.ts`: one-time ECB archive importer.
- `app/routes/api/*.ts`: JSON endpoints.
- `app/islands/playground.tsx`: interactive conversion UI.
- `app/routes/index.tsx`, `playground.tsx`, `docs.tsx`: public surfaces.
- `app/lib/forecast.ts`: baseline model and interval calculation.
- `scripts/self-check.ts`: runnable domain checks.

### Task 1: Domain Types and Validation

**Files:** Create `app/lib/types.ts`, `app/lib/validation.ts`, `scripts/self-check.ts`.

- [ ] Define `RateSnapshot`, `RateResult`, `ConversionResult`, `ApiError`, and forecast metadata types.
- [ ] Define zod schemas for uppercase 3-letter currencies, ISO dates, positive finite amounts, and horizons from 1 through 30.
- [ ] Implement `parseQuery(schema, query)` returning typed data or throwing an error with stable `error`, `message`, and `details` fields.
- [ ] Add self-check cases for valid query, invalid currency, future-date detection helper, non-positive amount, and invalid forecast horizon.
- [ ] Run `bun run scripts/self-check.ts`; expected output contains `self-check passed`.

### Task 2: Rate Source, Cache, and Conversion Service

**Files:** Create `app/lib/sources/er-api.ts`, `app/lib/rates.ts`; modify `app/lib/types.ts` if needed.

- [ ] Implement `fetchLatestRates(base: string): Promise<RateSnapshot>` against `https://open.er-api.com/v6/latest/{base}` with timeout and response-shape validation.
- [ ] Implement in-memory 60-minute cache keyed by uppercase base currency.
- [ ] Implement `getLatest(base)` and `convert({ from, to, amount, date? })` using `amount * (toRate / fromRate)` and return source, fetched time, and actual `rate_date`.
- [ ] Keep failed refreshes from deleting the last cached successful snapshot.
- [ ] Add self-check for cross-rate math and same-currency conversion.
- [ ] Run typecheck and self-check.

### Task 3: API Vertical Slice

**Files:** Create `app/routes/api/health.ts`, `latest.ts`, `convert.ts`, `currencies.ts`; create `app/lib/api.ts` for shared error/CORS response helpers.

- [ ] Add `GET /api/health` returning service status, UTC time, and data-source status.
- [ ] Add `GET /api/latest?base=USD`, defaulting to USD, with validation and JSON metadata.
- [ ] Add `GET /api/convert?from=USD&to=EUR&amount=100&date=YYYY-MM-DD` with 400/422 stable errors.
- [ ] Add `GET /api/currencies` from the source-supported currency list, including decimal metadata for JPY and other zero-decimal currencies.
- [ ] Add CORS headers and `OPTIONS` handling through shared helper.
- [ ] Run dev server and verify health, latest, convert, invalid amount, and future date with `curl`.

### Task 4: Postgres Persistence and Historical Data

**Files:** Create `app/lib/schema.sql`, `app/lib/db.ts`, `scripts/seed-ecb.ts`; modify `app/lib/rates.ts` and API routes.

- [ ] Create `daily_rates` with `date`, `base`, `currency`, `rate`, source metadata, unique `(date, base, currency)`, and indexes on `(date, base)` and `(currency, date)`.
- [ ] Create `rate_updates` with fetch time, source, status, and error text.
- [ ] Implement parameterized DB functions for latest snapshot, exact/prior-date lookup, and batch upsert.
- [ ] Make service lookup use DB when configured, then cache, and never replace usable data on failed source refresh.
- [ ] Implement ECB ZIP/XML import with explicit date parsing, EUR base normalization, and idempotent upsert.
- [ ] Add `GET /api/historical?date=YYYY-MM-DD&base=USD`, returning actual `rate_date`; reject future dates with 422.
- [ ] Run schema, seed against a fixture or downloaded archive, then verify historical lookup and holiday/weekend backward resolution.

### Task 5: Daily Ingestion Job

**Files:** Create `app/lib/jobs/fetch-rates.ts`; modify `app/server.ts`.

- [ ] Fetch the configured base snapshot, upsert all rates, and write successful `rate_updates` record.
- [ ] On failure, write failed update record and preserve previous rates.
- [ ] Wire Bun cron for daily execution without starting a duplicate job in development.
- [ ] Keep a callable `runDailyRateFetch()` for manual execution and tests.
- [ ] Run the job once locally and verify DB rows plus update status.

### Task 6: Forecast Contract and Baseline

**Files:** Create `app/lib/forecast.ts`, `app/routes/api/forecast.ts`, `scripts/backtest-forecast.ts`.

- [ ] Load chronological historical pair rates from DB.
- [ ] Implement transparent baseline: recent moving average with seasonal-naive fallback when history is short.
- [ ] Implement `forecastPair({ from, to, horizon })` for 1-30 days, returning estimate, lower/upper interval, model version, training date, horizon, and disclaimer.
- [ ] Use rolling backtest on held-out historical points and report MAE; do not expose forecast publicly if no usable history exists.
- [ ] Add route validation and stable errors.
- [ ] Run backtest fixture and self-check interval ordering, horizon bounds, and deterministic output.

### Task 7: Public Site and Playground

**Files:** Modify `app/routes/index.tsx`; create `app/routes/playground.tsx`, `app/islands/playground.tsx`; modify `app/style.css`.

- [ ] Build landing hero around a live conversion instrument, source/freshness explanation, historical timeline, API preview, and links to playground/docs.
- [ ] Build playground with amount/from/to/date controls, result metadata, raw JSON, copyable curl, and accessible copy status.
- [ ] Use responsive asymmetric editorial layout, warm off-white canvas, ink/cobalt/lime palette, thin rules, and monospace code/rates.
- [ ] Avoid generic cards, gradients, stock imagery, and vague “real-time” claims.
- [ ] Verify keyboard navigation, focus states, mobile layout, and reduced-motion CSS.

### Task 8: Docs, SEO, and Final Verification

**Files:** Create `app/routes/docs.tsx`, `app/routes/sitemap.xml.ts`, `app/routes/robots.txt.ts`; modify renderer metadata and navigation as needed.

- [ ] Document all API endpoints, parameters, examples, error contract, date semantics, source freshness, forecast disclaimer, and future roadmap.
- [ ] Add title, description, canonical URL placeholder based on configured site URL, Open Graph metadata, sitemap, and robots rules.
- [ ] Remove demo counter island and test content.
- [ ] Run `bunx tsc --noEmit`, `bun run build`, self-check, backtest, and dev-server curl checks.
- [ ] Review generated UI against `design.md` and verify no prohibited generic visual patterns.

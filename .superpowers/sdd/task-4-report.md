# Task 4 Report

## Status

Implemented Postgres persistence, ECB historical seeding, historical lookup, and dated conversion.

## Files

- `app/lib/schema.sql`: Added `daily_rates` and `rate_updates`, constraints, and lookup indexes.
- `app/lib/db.ts`: Added lazy `DATABASE_URL` configuration, parameterized latest/prior-date reads, and idempotent batch upsert.
- `app/lib/sources/ecb.ts`: Added explicit ECB XML date/rate parsing with EUR-base normalization.
- `scripts/seed-ecb.ts`: Added XML/ZIP seed command using ECB XML extraction and database upsert.
- `app/lib/rates.ts`: Added DB-first latest lookup, historical lookup, successful-refresh persistence, stale cache fallback, and dated conversion.
- `app/routes/api/historical.ts`: Added validated historical endpoint with future-date rejection through shared schema and actual `rate_date` responses.
- `app/routes/api/convert.ts`: Routed dated conversions through historical lookup.
- `scripts/task-4-self-check.ts`: Added runnable ECB parsing, prior-date resolution, and offline DB-safe service check.

## Verification

- `bun run scripts/task-4-self-check.ts`: PASS, output `task 4 self-check passed`.
- `bunx tsc --noEmit`: PASS.
- `bunx vite build`: PASS.
- `bun run build`: BLOCKED by existing `vite build --mode client` failure with no diagnostic output; SSR build completes when run separately.

## Concerns

- No live Postgres instance was available, so schema execution and real SQL integration were not run. `DATABASE_URL` remains optional, allowing typecheck/build without DB.
- ECB ZIP extraction depends on the host `unzip` command. Standard ECB archives are supported; XML fixtures are supported directly.
- Historical route returns `503 historical_unavailable` when DB is not configured or has no matching data. Dated conversion returns the shared `503` service error in that case.
- `rate_updates` schema exists, but ingestion currently does not record refresh status rows.
- `bun run build` retains the Task 3 client-mode build blocker.

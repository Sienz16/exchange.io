# Task 3 Report

## Status

Implemented API vertical slice: health, latest, latest-only convert, currencies, shared JSON/error helpers, and CORS headers.

## Files

- `app/lib/api.ts`: Added shared JSON response, stable API error, service error, CORS header, and OPTIONS helpers.
- `app/routes/api/health.ts`: Added service status, UTC timestamp, and source status response.
- `app/routes/api/latest.ts`: Added validated `base` query with USD default and latest snapshot metadata.
- `app/routes/api/convert.ts`: Added validated latest conversion and stable invalid-query/future-date responses. Dated conversion returns `422` until Task 4 historical lookup exists.
- `app/routes/api/currencies.ts`: Added source-backed currency list with decimal metadata. JPY and other zero-decimal currencies return `decimals: 0`.
- `app/routes/api/_middleware.ts`: Added API response CORS middleware.

## Verification

- `bunx tsc --noEmit`: PASS.
- `bun run scripts/self-check.ts`: PASS, output `self-check passed`.
- `bunx vite build`: PASS.
- `bun run build`: BLOCKED by existing `vite build --mode client` step, exits with code 1 without diagnostic output. SSR build passes.
- Dev server curl checks: PASS.
  - `/api/health`: `200`
  - `/api/latest?base=USD`: `200`
  - `/api/convert?from=USD&to=EUR&amount=100`: `200`
  - Invalid amount: `400`, `error: invalid_query`
  - Future date: `422`, `error: future_date`
  - `/api/currencies`: `200`, includes JPY with `decimals: 0`
  - `OPTIONS /api/latest`: `204`

## Concerns

- HonoX dev server owns automatic preflight handling. OPTIONS returns `204` with framework-default `Access-Control-Allow-Methods` including `GET`; GET API responses include the shared wildcard CORS headers. Custom preflight header values are not preserved by current dev adapter.
- Currency support is derived from the latest USD source snapshot. Persistent/source-normalized currency metadata belongs with later DB work.
- Dated conversion is intentionally rejected with `422`; Task 4 adds historical lookup.
- `bun run build` remains blocked by the existing client-mode build failure with no diagnostic output, as recorded in Task 2.

## Reviewer Fix

- Added source-supported currency validation at HTTP boundaries. Unknown codes return `400 unsupported_currency` with stable error body instead of triggering a source request and returning `503`.
- Added focused HTTP self-check at `scripts/api-self-check.ts` covering status/body, GET CORS, OPTIONS status/CORS methods, latest, unsupported currency, dated/future conversion behavior, health state transitions, and JPY decimals.
- Health no longer performs a network request. It reports `configured` before first lookup, `available` after a successful snapshot, `degraded` when serving stale cache after refresh failure, and `unavailable` after an uncached failure, with `checked_at` metadata.
- Clarified Task 3 brief and plan: conversion is latest-only; date support belongs to Task 4 and currently returns `422 historical_unavailable`.

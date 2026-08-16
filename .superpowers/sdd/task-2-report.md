# Task 2 Report

## Status

Implemented Task 2: rate source adapter, in-memory cache, latest lookup, and latest cross-rate conversion.

## Files

- `app/lib/sources/er-api.ts`: Added `open.er-api.com` adapter with uppercase base normalization, 10-second abort timeout, HTTP checks, response-shape validation, source date parsing, and snapshot metadata.
- `app/lib/rates.ts`: Added replaceable source boundary, uppercase-base 60-minute cache, stale-cache preservation after refresh failure, `getLatest`, and `convert` using `amount * (toRate / fromRate)`.
- `scripts/self-check.ts`: Added deterministic checks for cross-rate math, same-currency conversion, cache reuse, initial source failure, and stale snapshot preservation.

## Tests

- `bun run scripts/self-check.ts`: PASS, output `self-check passed`.
- `bunx tsc --noEmit`: PASS.
- `bunx vite build`: PASS.
- `git diff --check`: PASS.

## Concerns

- `bun run build` remains blocked by the existing `vite build --mode client` step, which exits with code 1 without diagnostic output. The SSR `bunx vite build` passes.
- Historical/date-based conversion is intentionally not implemented because Task 2 excludes DB and historical lookup. `convert` rejects a supplied `date` until the historical service exists.
- Cache is process-local and will reset on worker restart or isolate eviction. Persistent cache belongs with the later DB/job work.

## Reviewer Fix

- Base inputs are trimmed and uppercased before source URLs, cache keys, and conversion lookups.
- Source payloads now require a plain, non-empty rates object containing the requested base currency; every rate must be finite and positive.
- Cache checks explicitly preserve snapshots at 59:59 and refresh at exactly 60:00; successful refreshes replace cached snapshots.
- Source checks cover HTTP failure, malformed and empty rates, non-finite rates, invalid update dates, and abort timeout using injected fetch/timeout values without network access.
- `convert` is explicitly latest-only. It no longer accepts `date`; historical/date conversion is reserved for Task 4's DB-backed historical lookup service.

## Reviewer Fix Tests

- `bun run scripts/self-check.ts`: PASS, output `self-check passed`.
- `bunx tsc --noEmit`: PASS.
- `bunx vite build`: PASS.

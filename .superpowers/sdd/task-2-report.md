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

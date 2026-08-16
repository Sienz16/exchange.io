# Task 1 Report

## Status

Implemented Task 1: Domain Types and Validation.

## Files

- `app/lib/types.ts`: Added rate, conversion, API error, and forecast metadata/result types.
- `app/lib/validation.ts`: Added currency, ISO date, positive amount, horizon, query schemas, `isFutureDate`, and stable `parseQuery` errors.
- `scripts/self-check.ts`: Added runnable checks for valid queries, invalid currencies, future dates, non-positive amounts, invalid horizons, and invalid calendar dates.

## Tests

- `bun run scripts/self-check.ts`: PASS, output contains `self-check passed`.
- `bunx tsc --noEmit`: PASS.
- `bunx vite build`: PASS.
- `bun run build`: FAIL because the existing `vite build --mode client` step exits with code 1 without diagnostic output; the SSR build passes independently.

## Concerns

- `bun run build` remains blocked by the existing client-mode Vite build configuration. No Task 1 file appears in the reported failure.
- No test runner exists in `package.json`; the required domain checks use the requested Bun self-check script instead of a test framework.
- Currency support is syntax-only in Task 1. Supported-currency enforcement belongs to later source/service work.

## Review Fix

- Future dates now reject in convert and historical query validation with stable `{ error, message, details }` errors.
- Amount and horizon schemas accept numeric strings but reject unsafe coercions such as booleans and empty strings.
- `RateResult` reuses `RateSnapshot` to remove duplicate structure.
- Self-check now asserts stable error keys for future-date failures and rejects unsafe numeric inputs.

## Review Fix Tests

Command: `bun run scripts/self-check.ts`

Exact output:

```text
self-check passed
```

Command: `bunx tsc --noEmit`

Exact output:

```text
(no output; exit code 0)
```

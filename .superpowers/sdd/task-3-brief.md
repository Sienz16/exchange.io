### Task 3: API Vertical Slice

**Files:** Create `app/routes/api/health.ts`, `latest.ts`, `convert.ts`, `currencies.ts`; create `app/lib/api.ts` for shared error/CORS response helpers.

- [ ] Add `GET /api/health` returning service status, UTC time, and data-source status.
- [ ] Add `GET /api/latest?base=USD`, defaulting to USD, with validation and JSON metadata.
- [ ] Add latest-only `GET /api/convert?from=USD&to=EUR&amount=100` with 400 stable errors; reject any `date` query with stable `422 historical_unavailable` until Task 4.
- [ ] Add `GET /api/currencies` from the source-supported currency list, including decimal metadata for JPY and other zero-decimal currencies.
- [ ] Add CORS headers and `OPTIONS` handling through shared helper.
- [ ] Run dev server and verify health, latest, convert, invalid amount, and future date with `curl`.

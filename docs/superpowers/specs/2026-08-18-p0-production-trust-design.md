# P0 Production Trust Fixes

## Scope

Implement all nine P0 items from `IMPROVEMENTS.md`. Do not implement P1-P3 items in this pass. Do not stage or commit `IMPROVEMENTS.md` or `.commandcode/`.

## Design

- Add a dedicated in-memory `5 requests/minute/IP` limiter to `POST /admin/login`.
- Enforce an `ADMIN_TOKEN` minimum length of 32 characters when the token is read. Login bodies must remain bounded.
- Resolve client IP from `cf-connecting-ip`, or the last `X-Forwarded-For` hop when no trusted-proxy configuration exists. Use the same resolver for API and admin limits.
- Make health status truthful: probe configured PostgreSQL with a short cached `SELECT 1`, report data older than 26 hours as degraded, and return HTTP 503 for degraded or unavailable states.
- Treat empty `ANALYTICS_SALT` as unset. Without a real salt, disable IP telemetry hashing rather than using a predictable fallback.
- Limit conversion amounts to `1e12` and reject non-finite conversion results before returning JSON.
- Log unknown internal errors server-side and return only a generic service-unavailable message to clients.
- Apply a 10-second timeout to Frankfurter fallback requests.
- Return JSON `{ error: "not_found" }` for unknown `/api/*` paths.
- Correct source labels, sample response values, homepage copy, and render inline code in docs with JSX `<code>` elements.

## Verification

Extend existing Bun self-checks for the new security and correctness boundaries. Run:

```bash
bun run typecheck
bun run check
bun run build
```

Review the final diff and commit only the P0 files, tests, and this spec.

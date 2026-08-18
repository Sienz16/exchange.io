<div align="center">

# exchange.io

**A free, no-key currency API — daily reference rates for 30 currencies, history back to 1999, and honest metadata on every number.**

<a href="https://bun.sh"><img src="https://img.shields.io/badge/runtime-Bun_/_Node_/_Workers-14151a?style=flat-square" alt="Runtime: Bun / Node / Workers"></a>
<img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript strict">
<img src="https://img.shields.io/badge/HonoX-React_19_islands-e36002?style=flat-square" alt="HonoX + React 19 islands">
<img src="https://img.shields.io/badge/PostgreSQL-daily_reference_history-416ede?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
<img src="https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS v4">
<a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License: MIT"></a>

<img src="https://img.shields.io/badge/API-no_key_required-d4f74f?style=flat-square" alt="No API key required">
<img src="https://img.shields.io/badge/currencies-30-d4f74f?style=flat-square" alt="30 currencies">
<img src="https://img.shields.io/badge/history-back_to_1999-d4f74f?style=flat-square" alt="History back to 1999">
<img src="https://img.shields.io/badge/forecasts-published_model_metadata-8bd5ca?style=flat-square" alt="Forecasts with published model metadata">

[Quick start](#quick-start) · [API](#api) · [Architecture](#architecture) · [Admin dashboard](#admin-dashboard) · [Roadmap](#roadmap)

</div>

---

## Why exchange.io?

Most "free" rate APIs are thin wrappers around someone else's data — with opaque freshness, daily request caps, and $20/month paywalls for anything historical. exchange.io owns the whole pipeline: it fetches reference rates on a schedule, stores them as dated, traceable rows, and serves them with provenance attached.

- **Every response carries its paper trail** — source, rate date, and fetch time. Freshness is a fact, not a vibe.
- **History is a first-class citizen** — the full ECB archive back to 1999, queried by date, free.
- **No key, no signup, no quota theater** — if you can send an HTTP request, you already have access.

## Quick start

```bash
git clone <repo-url> && cd exchange-io
bun install
bun run dev                                   # → http://localhost:5173
curl "http://localhost:5173/api/convert?from=USD&to=EUR&amount=100"
```

```json
{
  "from": "USD", "to": "EUR", "amount": 100,
  "result": 92.16, "rate": 0.9216,
  "rate_date": "2026-08-16",
   "source": "ecb.europa.eu",
  "fetched_at": "2026-08-16T00:04:12.000Z"
}
```

Prefer to click first? The built-in [playground](http://localhost:5173/playground) converts live, shows the raw JSON, and hands you a copy-paste `curl`.

## API

OpenAPI 3.1 specification: [`public/openapi.yaml`](public/openapi.yaml). The interactive [docs page](/docs) includes endpoint parameters and examples.

| Endpoint | What it does | Example |
| --- | --- | --- |
| `GET /api/latest` | Newest reference snapshot, any base currency | `/api/latest?base=USD` |
| `GET /api/convert` | Convert an amount — latest, or `date` for a historical rate | `/api/convert?from=USD&to=EUR&amount=100` |
| `GET /api/historical` | Stored snapshot for a date; weekends/holidays resolve to the prior reference | `/api/historical?date=2024-01-15&base=USD` |
| `GET /api/forecast` | Statistical estimate with interval, model version, training date, disclaimer | `/api/forecast?from=USD&to=EUR&horizon=7` |
| `GET /api/currencies` | Supported codes with display precision (JPY = 0 decimals, etc.) | `/api/currencies` |
| `GET /api/health` | Liveness and data-source state | `/api/health` |
| `GET /api/timeseries` | Daily rates across a date range | `/api/timeseries?start=2024-01-01&end=2024-01-31&base=USD` |
| `GET /api/fluctuation` | Change and percentage change across a date range | `/api/fluctuation?start=2024-01-01&end=2024-01-31&base=USD` |
| `GET /api/batch-convert` | Convert one amount to multiple currencies | `/api/batch-convert?from=USD&to=EUR,GBP,JPY&amount=100` |
| `GET /api/metadata` | Currency names, regions, flags, and symbols | `/api/metadata` |
| `GET /api/coverage` | Dataset date range, sources, and refresh schedule | `/api/coverage` |

All query strings are validated with zod; errors return structured `{ error, message, details }` bodies. Full parameter reference and semantics: the [/docs](http://localhost:5173/docs) page served by the app itself.

## Features

- [x] 30 currencies, daily reference rates from the European Central Bank
- [x] Historical ECB archive seeded back to 1999
- [x] Provenance metadata (source · rate date · fetch time) on every response
- [x] Cross-rate math server-side; zero-decimal currencies respected
- [x] Statistical forecasts with model metadata and a mandatory disclaimer
- [x] Interactive playground with searchable currency picker and shareable output
- [x] Privacy-preserving admin dashboard: traffic, latency, pipeline health
- [x] Runtime-agnostic — Bun (default), Node, or Cloudflare Workers from one codebase

## Architecture

```
                  ECB archive (one-time seed)
  │  daily job, 00:30 UTC        │
  ▼                              ▼
┌─────────────────────────────────────────────────────┐
│ PostgreSQL                                          │
│  daily_rates · rate_updates · api_requests(_hourly) │
└─────────────────────────────────────────────────────┘
        ▲                              ▲
        │ serve + live-source          │ hourly rollup, :03
        │ fallback when stale          │ (cron, idempotent)
┌───────┴──────────────────────────────┴───────────┐
│ HonoX app                                        │
│  /api/*            JSON · zod-validated · CORS  │
│                    └─ telemetry middleware ─────┘
│  / · /playground · /docs    SSR + React islands │
│  /admin            session-gated ops dashboard  │
└──────────────────────────────────────────────────┘
```

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | [HonoX](https://github.com/honojs/honox) (Hono) | file-based routes, middleware, one fetch handler for every runtime |
| UI | React 19 islands | SSR via `@hono/react-renderer`; hydration only where needed |
| Styling | Tailwind CSS v4 | custom theme system, light + dark |
 | Data | PostgreSQL (`postgres.js`) | single-connection pool; ECB archive upstream |
| Validation | zod v4 | every query string, structured error bodies |
| Scheduling | `Bun.cron` / Workers cron triggers | daily ingest + hourly telemetry rollup |

## Project structure

```
app/
  routes/            # HonoX file routes: pages, /api endpoints, _middleware, _renderer
    admin/           #   login/logout POST handlers
    api/             #   latest · convert · historical · forecast · currencies · health
  islands/           # React 19 islands: playground, rate ticker, theme toggle, scroll fx
  lib/               # domain core: rates, forecast, analytics, db, admin-auth,
                     #   validation, env, jobs/fetch-rates, sources/{er-api, ecb}
scripts/             # ECB seed + self-check suites (bun run check)
```

## Development

```bash
bun install
bun run dev
```

Configuration is read from the environment (Bun loads `.env` automatically):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (required for historical data + persistence) |
| `DAILY_RATE_BASE` | Base currency the daily job refreshes (default `USD`) |
| `ADMIN_TOKEN` | Enables the private `/admin` dashboard when set (use a long random string) |
| `ANALYTICS_SALT` | Optional salt for telemetry IP hashes (defaults to `ADMIN_TOKEN`) |

Apply the schema and (optionally) seed ECB history:

```bash
psql "$DATABASE_URL" -f app/lib/schema.sql
bun run scripts/seed-ecb.ts <path-to-ecb-zip-or-xml>
```

The API serves latest rates even without a database (live-source fallback); historical and forecast endpoints need the database.

## Production — Bun (default)

```bash
bun run build
DATABASE_URL=... bun dist/index.js   # serves on PORT (default 3000)
```

The built server serves the API, SSR pages, and static assets. Outside development it registers a daily cron (`Bun.cron`, 00:30 UTC) that fetches reference rates into Postgres, plus an hourly cron (`:03`) that rolls up API telemetry. Run it under a supervisor (systemd, docker, etc.) on a VPS.

## Production — Containers

`Dockerfile` builds a multi-stage, non-root Bun image. It works with Docker, Podman, Coolify, Kubernetes, and other OCI-compatible platforms. The image exposes port `3000`, reads `PORT` at runtime, runs `/api/health` as its container health check, and does not bundle PostgreSQL.

Build and run with any OCI-compatible runtime:

```bash
docker build -t exchange-io .
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e DATABASE_URL='postgres://...' \
  -e ADMIN_TOKEN="$(openssl rand -hex 32)" \
  exchange-io
```

`docker-compose.example.yml` provides an optional app-plus-PostgreSQL example. Copy it to `compose.yml`, create a secret `.env` file outside Git, start the services, then apply the schema from a machine with `psql` and seed ECB history using the repository's Bun tooling before removing local build files:

```bash
docker compose -f docker-compose.example.yml up -d --build
psql "$DATABASE_URL" -f app/lib/schema.sql
bun run scripts/seed-ecb.ts <path-to-ecb-zip-or-xml>
```

For production, managed PostgreSQL or a separately operated database is preferred over the example database service. Persist database storage and backups; the app container itself is stateless.

### Generic VPS launch checklist

The application includes portable app-level protection: a bounded in-memory limit of 120 API requests per client IP per minute, cache headers for successful API responses, request-refresh single-flight protection, and truthful health status. Put a reverse proxy in front of the app for TLS, stronger edge rate limits, request size limits, and access logs.

The in-memory limiter is intentionally safe for one app process only. If running multiple app instances, enforce the public limit at the shared reverse proxy/load balancer, or replace `app/lib/rate-limit.ts` with a shared-store implementation (for example, Redis or PostgreSQL advisory/row-based counters). Do not assume each instance's local limiter adds up to one global limit.

For scaled deployments, provide `globalThis.exchangeRateLimitStore` with async `check(key, limit, windowMs)` to enforce one shared bucket across instances. Local memory remains default when no store is provided.

1. Create a PostgreSQL database with TLS enabled and a dedicated application user.
2. Apply schema and seed history:

   ```bash
   psql "$DATABASE_URL" -f app/lib/schema.sql
   bun run scripts/seed-ecb.ts <path-to-ecb-zip-or-xml>
   ```

3. Set secrets outside the repository:

   ```bash
   export DATABASE_URL='postgres://...'
   export ADMIN_TOKEN="$(openssl rand -hex 32)"
   export NODE_ENV=production
   ```

4. Build and start the app:

   ```bash
   bun install --frozen-lockfile
   bun run typecheck
   bun run check
   bun run build
   bun dist/index.js
   ```

5. Run `bun dist/index.js` under systemd, Docker, or another supervisor. Restart after crashes and keep one active scheduler process unless duplicate jobs are intentionally coordinated.
6. Configure Caddy/Nginx or equivalent for HTTPS, proxy only trusted client-IP headers, and add proxy-level rate limits. Do not expose the Bun port directly to the Internet.
7. Monitor `/api/health`, HTTP 5xx/429 rates, newest `daily_rates.fetched_at`, and failed `rate_updates` rows. Alert when the newest successful rate is older than 26 hours.
8. Schedule encrypted PostgreSQL backups and test restoring one before launch. Keep a rollback copy of the previous application build.

The source code cannot create your VPS, database, DNS, TLS certificate, secrets, firewall rules, backups, or monitoring alerts. Complete and verify those infrastructure steps before declaring the service public.

## Production — Cloudflare Workers (optional)

```bash
bun run deploy:worker
```

Requires `wrangler secret put DATABASE_URL` (a TLS-capable Postgres such as Neon; plain TCP works, Hyperdrive recommended for production). The same daily refresh and hourly rollup run through the `scheduled` handler and the cron triggers in `wrangler.jsonc`. For local preview, `bun run preview:worker` uses `.dev.vars` (see `.dev.vars.example`).

Node is also available as a build target (`DEPLOY_TARGET=node`) but needs `@hono/node-server` installed and does not register the cron — drive `createDailyRateFetcher` from system cron instead.

## Admin dashboard

Set `ADMIN_TOKEN` (a long random string) and open `/admin`: sign in once with the token
to get a 12-hour session cookie. The dashboard shows API request volume, latency,
errors, top routes/pairs/referers, and data-pipeline health (ingest history, snapshot
freshness, rate-service cache counters). Requests are recorded in batches to the
`api_requests` table and condensed hourly into `api_requests_hourly` (raw rows are
pruned after 90 days) — re-apply the schema after upgrading:

```bash
psql "$DATABASE_URL" -f app/lib/schema.sql
```

Privacy: no raw IPs or user agents are stored. IPs are reduced to daily-rotating
salted hashes; user agents to a `browser`/`script`/`bot` classification. The hourly
rollup runs at `:03` every hour (Bun cron / Workers scheduled trigger) and defensively
before each dashboard read. Without `ADMIN_TOKEN` the dashboard stays disabled, and
`/api/health` pings are never recorded.

## Checks

```bash
bun run typecheck   # tsc --noEmit
bun run check       # self-check suites: validation · rates · forecast · API · admin/auth/telemetry
```

The repository currently uses Bun's built-in `node:assert` self-check scripts instead of adding a test framework. Add Vitest or another runner when parallel test files, coverage thresholds, fixtures, or browser tests justify the dependency.

The HonoX plugin still passes Vite's deprecated `esbuild` option internally. The build logger suppresses only that known upstream warning until HonoX removes it. Vite uses esbuild CSS minification because Vite 8's Lightning CSS parser does not understand Tailwind's `@theme` and `@tailwind` directives.

## Roadmap

- [ ] Per-IP rate limiting (429 + `Retry-After`) — the key pre-launch hardening item
- [ ] HTTP caching: `Cache-Control` + ETag/304 on API responses
- [ ] `GET /api/timeseries` and `GET /api/fluctuation`
- [ ] OpenAPI 3.1 spec + generated SDK snippets
- [ ] Forecast v2: multi-model competition with published, continuously backtested accuracy
- [ ] Second upstream source with failover and cross-validation

## Data Sources & Acknowledgements

All rate data comes from the **European Central Bank**, used in line with the
[ECB's copyright terms](https://www.ecb.europa.eu/services/disclaimer/html/index.en.html)
(cited as source; published for information purposes; the ECB accepts no liability
for reliance on it):

- [ECB daily reference feed](https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml) — daily EUR reference rates, 30 currencies
- [ECB euro reference rates archive](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html) — official history back to 1999

Rates for non-EUR bases are derived from the EUR references. This transformation is
performed by exchange.io and does not represent an ECB endorsement. Not financial advice.

The code is released under the [MIT License](LICENSE). Rates remain reference data from their upstream sources — not financial advice.

# exchange.io

Currency exchange rates API with daily reference rates, historical data, conversion, and statistical forecasts.

## Features

- Daily rates from `` (30 currencies, refreshed at 00:30 UTC)
- Historical ECB data support (seeded back to 1999 from the official archive)
- Current, historical, conversion, and forecast endpoints
- Interactive playground with searchable currency picker
- Developer documentation and SEO landing page

## Stack

- [HonoX](https://github.com/honojs/honox) (Hono) with React 19 islands, Tailwind v4
- PostgreSQL via `postgres` (postgres.js)
- Bun as the runtime and package manager
- Runtime-agnostic build: Bun (default), Node, or Cloudflare Workers

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

## Production — Cloudflare Workers (optional)

```bash
bun run deploy:worker
```

Requires `wrangler secret put DATABASE_URL` (a TLS-capable Postgres such as Neon; plain TCP works, Hyperdrive recommended for production). The same daily refresh runs through the `scheduled` handler and the cron trigger in `wrangler.jsonc`. For local preview, `bun run preview:worker` uses `.dev.vars` (see `.dev.vars.example`).

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
bun run check       # unit + API self-checks
```

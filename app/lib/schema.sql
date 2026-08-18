CREATE TABLE IF NOT EXISTS daily_rates (
  date date NOT NULL,
  base varchar(3) NOT NULL CHECK (base ~ '^[A-Z]{3}$'),
  currency varchar(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  rate numeric NOT NULL CHECK (rate > 0),
  source text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, base, currency)
);

CREATE INDEX IF NOT EXISTS daily_rates_base_currency_date_idx ON daily_rates (base, currency, date);
CREATE INDEX IF NOT EXISTS daily_rates_currency_date_idx ON daily_rates (currency, date);

CREATE TABLE IF NOT EXISTS rate_updates (
  id bigserial PRIMARY KEY,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error')),
  error_text text
);

-- API request telemetry (admin dashboard). No raw IPs or user agents: ip_hash
-- is a daily-rotating salted hash, ua_class is a 3-way classification.
CREATE TABLE IF NOT EXISTS api_requests (
  ts timestamptz NOT NULL,
  route text NOT NULL,
  status integer NOT NULL,
  duration_ms integer NOT NULL,
  ip_hash text NOT NULL,
  referer_domain text,
  ua_class text NOT NULL,
  pair text
);

CREATE INDEX IF NOT EXISTS api_requests_ts_route_idx ON api_requests (ts, route);

CREATE TABLE IF NOT EXISTS api_requests_hourly (
  hour_utc timestamptz NOT NULL,
  route text NOT NULL,
  requests integer NOT NULL,
  errors integer NOT NULL,
  avg_ms double precision NOT NULL,
  p95_ms double precision NOT NULL,
  uniques integer NOT NULL,
  PRIMARY KEY (hour_utc, route)
);

CREATE INDEX IF NOT EXISTS rate_updates_fetched_at_idx ON rate_updates (fetched_at);

CREATE OR REPLACE FUNCTION prune_exchange_rollups() RETURNS void LANGUAGE sql AS $$
  DELETE FROM api_requests_hourly WHERE hour_utc < now() - interval '2 years';
  DELETE FROM rate_updates WHERE fetched_at < now() - interval '2 years';
$$;

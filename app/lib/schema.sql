CREATE TABLE IF NOT EXISTS daily_rates (
  date date NOT NULL,
  base varchar(3) NOT NULL,
  currency varchar(3) NOT NULL,
  rate numeric NOT NULL CHECK (rate > 0),
  source text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, base, currency)
);

CREATE INDEX IF NOT EXISTS daily_rates_date_base_idx ON daily_rates (date, base);
CREATE INDEX IF NOT EXISTS daily_rates_currency_date_idx ON daily_rates (currency, date);

CREATE TABLE IF NOT EXISTS rate_updates (
  id bigserial PRIMARY KEY,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  status text NOT NULL,
  error_text text
);

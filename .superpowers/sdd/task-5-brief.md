# Task 5: Daily Ingestion Job

- Create `app/lib/jobs/fetch-rates.ts` with callable `runDailyRateFetch()`.
- Fetch configured base snapshot, upsert rates, and record successful `rate_updates` row.
- On fetch or persistence failure, record failed `rate_updates` row and preserve existing rates.
- Wire Bun cron for daily execution without duplicate dev jobs.
- Reuse existing source and database APIs; keep Cloudflare build-safe.

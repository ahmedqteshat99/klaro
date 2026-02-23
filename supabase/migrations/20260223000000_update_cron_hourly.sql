-- Update hospital scraper CRON to run hourly with larger batches
-- This ensures all 500+ hospitals are scanned within 24 hours

-- =====================
-- Remove old daily CRON jobs (if they exist)
-- =====================

DO $$
BEGIN
  -- Try to unschedule old jobs, ignore if they don't exist
  PERFORM cron.unschedule('scrape-hospital-jobs-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('discover-career-pages-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =====================
-- New hourly CRON jobs for full 24-hour coverage
-- =====================

-- Career Page Discovery: Every 2 hours (slower, less urgent)
-- Processes 50 hospitals per run = 600 hospitals/day
SELECT cron.schedule(
  'discover-career-pages-every-2h',
  '0 */2 * * *', -- Every 2 hours at minute 0
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/discover-career-pages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Job Scraper: Every hour (high priority for fresh jobs)
-- Processes 25 hospitals per run = 600 hospitals/day
SELECT cron.schedule(
  'scrape-hospital-jobs-hourly',
  '30 * * * *', -- Every hour at minute 30 (offset from career discovery)
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/scrape-hospital-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================
-- Verify CRON jobs
-- =====================

-- View all scheduled jobs
SELECT * FROM cron.job;

-- =====================
-- Expected Coverage
-- =====================

-- Career Discovery:
--   25 hospitals × 12 runs/day = 300 hospitals/day
--   Full cycle every ~2 days (reduced to avoid WORKER_LIMIT errors)

-- Job Scraper:
--   25 hospitals × 24 runs/day = 600 hospitals/day ✅
--   Full cycle every 24 hours

-- =====================
-- Notes
-- =====================

-- IMPORTANT: Edge functions batch sizes:
-- - discover-career-pages: .limit(25) — reduced from 50 to avoid WORKER_LIMIT errors
-- - scrape-hospital-jobs: .limit(25) — safe for resource limits

-- Timeout safety:
-- - Career discovery: 25 hospitals × 3s = 75s (well under 150s limit, avoids WORKER_LIMIT)
-- - Job scraper: 25 hospitals × 5s = 125s + scraping ≈ 140s (safe)

COMMENT ON EXTENSION pg_cron IS 'Hourly CRON schedule for 500+ hospital coverage - Updated 2026-02-23';

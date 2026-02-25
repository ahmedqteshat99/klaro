-- Update stale link checker to run hourly instead of daily
-- Reduces stale link detection lag from 23 hours to ~1 hour

-- =====================
-- Remove old daily schedule
-- =====================

DO $$
BEGIN
  PERFORM cron.unschedule('stale-link-check-job');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =====================
-- Create new hourly schedule
-- =====================

-- Stale Link Checker: Every hour at minute 30
SELECT cron.schedule(
  'stale-link-check-hourly',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/check-stale-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================
-- Verify schedule
-- =====================

-- View updated schedule
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%stale%'
ORDER BY jobname;

COMMENT ON EXTENSION pg_cron IS 'Hourly stale link checker + staggered RSS imports - Updated 2026-02-25';

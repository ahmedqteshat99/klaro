-- Staggered hourly RSS import schedule
-- Each source runs every 4 hours at a different offset for 24/7 coverage
-- Pattern: PraktischArzt (0,4,8,12,16,20), Ethimedis (1,5,9,13,17,21),
--          Stellenmarkt (2,6,10,14,18,22), Ärzteblatt (3,7,11,15,19,23)

-- =====================
-- Remove old 4-hour bulk import
-- =====================

DO $$
BEGIN
  PERFORM cron.unschedule('rss-import-job');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- =====================
-- Create new staggered hourly imports
-- =====================

-- PraktischArzt: hours 0, 4, 8, 12, 16, 20
SELECT cron.schedule(
  'rss-import-praktischarzt-hourly',
  '0 0,4,8,12,16,20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{"sources": ["praktischarzt"]}'::jsonb
  );
  $$
);

-- Ethimedis: hours 1, 5, 9, 13, 17, 21
SELECT cron.schedule(
  'rss-import-ethimedis-hourly',
  '0 1,5,9,13,17,21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{"sources": ["ethimedis"]}'::jsonb
  );
  $$
);

-- Stellenmarkt: hours 2, 6, 10, 14, 18, 22
SELECT cron.schedule(
  'rss-import-stellenmarkt-hourly',
  '0 2,6,10,14,18,22 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{"sources": ["stellenmarkt_medizin"]}'::jsonb
  );
  $$
);

-- Ärzteblatt: hours 3, 7, 11, 15, 19, 23
SELECT cron.schedule(
  'rss-import-aerzteblatt-hourly',
  '0 3,7,11,15,19,23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{"sources": ["aerzteblatt"]}'::jsonb
  );
  $$
);

-- =====================
-- Verify schedule
-- =====================

-- View all RSS import jobs
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE 'rss-import-%'
ORDER BY jobname;

COMMENT ON EXTENSION pg_cron IS 'Staggered hourly RSS imports - 4 sources × 6 runs/day = 24 imports total';

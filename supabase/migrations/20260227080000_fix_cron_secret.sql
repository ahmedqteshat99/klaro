-- Fix: Cron jobs sending NULL as x-cron-secret header
-- Root cause: current_setting('app.settings.cron_secret', true) returns NULL
-- because the setting was never configured in the database.
-- Fix: Re-create all cron jobs with the literal secret hardcoded.
-- This is the standard Supabase pattern (cron command SQL is stored literally at creation time).

-- =====================
-- Remove all existing RSS import and stale link cron jobs (any version)
-- =====================

DO $$ BEGIN PERFORM cron.unschedule('rss-import-job');            EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('rss-import-praktischarzt-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('rss-import-ethimedis-hourly');     EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('rss-import-stellenmarkt-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('rss-import-aerzteblatt-hourly');   EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('stale-link-check-job');            EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM cron.unschedule('stale-link-check-hourly');         EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- =====================
-- RSS Import: 4 sources staggered every 4 hours (6 runs/day each)
-- Pattern: PraktischArzt (0,4,8,12,16,20), Ethimedis (1,5,9,13,17,21),
--          Stellenmarkt (2,6,10,14,18,22), Ärzteblatt (3,7,11,15,19,23)
-- =====================

-- PraktischArzt
SELECT cron.schedule(
  'rss-import-praktischarzt-hourly',
  '0 0,4,8,12,16,20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb,
    body := '{"sources": ["praktischarzt"]}'::jsonb
  );
  $$
);

-- Ethimedis
SELECT cron.schedule(
  'rss-import-ethimedis-hourly',
  '0 1,5,9,13,17,21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb,
    body := '{"sources": ["ethimedis"]}'::jsonb
  );
  $$
);

-- Stellenmarkt
SELECT cron.schedule(
  'rss-import-stellenmarkt-hourly',
  '0 2,6,10,14,18,22 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb,
    body := '{"sources": ["stellenmarkt_medizin"]}'::jsonb
  );
  $$
);

-- Ärzteblatt
SELECT cron.schedule(
  'rss-import-aerzteblatt-hourly',
  '0 3,7,11,15,19,23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb,
    body := '{"sources": ["aerzteblatt"]}'::jsonb
  );
  $$
);

-- =====================
-- Stale Link Checker: every hour at minute 30
-- =====================

SELECT cron.schedule(
  'stale-link-check-hourly',
  '30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/check-stale-jobs',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- =====================
-- Verify — run this to confirm all 5 jobs have the correct secret
-- =====================

SELECT jobname, schedule, command
FROM cron.job
WHERE jobname LIKE 'rss-import-%' OR jobname LIKE 'stale-link-%'
ORDER BY jobname;

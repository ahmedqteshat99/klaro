-- Schedule Berlin hospital scraper to run twice daily
-- 5 hospitals per run × 2 runs/day = 10/day → full cycle every ~3 days

SELECT cron.schedule(
  'scrape-berlin-hospitals-twice-daily',
  '0 6,18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/scrape-berlin-hospitals',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

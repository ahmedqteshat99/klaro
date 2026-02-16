-- Enable the required extensions for network requests and cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the RSS import job (every 4 hours)
-- Uses x-cron-secret to bypass standard auth (validated against CRON_SECRET env var)
SELECT cron.schedule(
  'rss-import-job',
  '0 */4 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs',
      headers:='{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb
    ) as request_id;
  $$
);

-- Schedule the stale link check job (daily at 3 AM)
SELECT cron.schedule(
  'stale-link-check-job',
  '0 3 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/check-stale-jobs',
      headers:='{"Content-Type": "application/json", "x-cron-secret": "Klaro_Secure_Cron_Auth_Key_2026_v1"}'::jsonb
    ) as request_id;
  $$
);

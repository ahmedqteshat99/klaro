-- Schedule hospital job scraper to run daily at 3 AM
-- Note: This requires pg_cron extension to be enabled

SELECT cron.schedule(
  'scrape-hospital-jobs-daily',
  '0 3 * * *', -- Every day at 3:00 AM
  $$
  SELECT
    net.http_post(
      url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/scrape-hospital-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', current_setting('app.settings.cron_secret', true)
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Comments
COMMENT ON EXTENSION pg_cron IS 'Hospital job scraper runs daily at 3 AM to discover new Assistenzarzt positions';

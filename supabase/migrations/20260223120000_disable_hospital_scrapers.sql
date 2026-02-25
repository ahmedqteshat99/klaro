-- Disable hospital job scraper and career page discovery CRON jobs
-- Keeps only: RSS import (every 4h) and stale link checker (daily 3 AM)

-- Disable hospital job scraper (hourly)
DO $$
BEGIN
  PERFORM cron.unschedule('scrape-hospital-jobs-hourly');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- Ignore if job doesn't exist
END $$;

-- Disable career page discovery (2-hourly)
DO $$
BEGIN
  PERFORM cron.unschedule('discover-career-pages-every-2h');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- Ignore if job doesn't exist
END $$;

-- Result: Only rss-import-job and stale-link-check-job remain active

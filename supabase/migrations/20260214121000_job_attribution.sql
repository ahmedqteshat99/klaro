-- Job Ad Attribution System for Fair Use Compliance
-- Adds source attribution, copyright disclaimers, and cache expiration

-- Add attribution fields to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_name TEXT,
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cache_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attribution_metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for cache expiration checks
CREATE INDEX IF NOT EXISTS idx_jobs_cache_expires
  ON jobs(cache_expires_at)
  WHERE cache_expires_at IS NOT NULL;

-- Function to set cache expiration (7 days from scrape)
CREATE OR REPLACE FUNCTION set_job_cache_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If scraped_at is set and cache_expires_at is not, set expiration to 7 days
  IF NEW.scraped_at IS NOT NULL AND NEW.cache_expires_at IS NULL THEN
    NEW.cache_expires_at := NEW.scraped_at + INTERVAL '7 days';
  END IF;

  -- Add disclaimer to metadata
  IF NEW.source_url IS NOT NULL THEN
    NEW.attribution_metadata := jsonb_set(
      COALESCE(NEW.attribution_metadata, '{}'::jsonb),
      '{disclaimer}',
      '"Originalanzeige beim Arbeitgeber prüfen - Klaro übernimmt keine Gewähr für Aktualität und Richtigkeit"'::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to auto-set cache expiration
DROP TRIGGER IF EXISTS trigger_set_job_cache_expiration ON jobs;
CREATE TRIGGER trigger_set_job_cache_expiration
  BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_cache_expiration();

-- Function to cleanup expired job ads
CREATE OR REPLACE FUNCTION cleanup_expired_jobs()
RETURNS TABLE (deleted_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  -- Delete jobs that have exceeded their cache expiration
  DELETE FROM jobs
  WHERE cache_expires_at IS NOT NULL
    AND cache_expires_at < NOW()
    AND scraped_at IS NOT NULL; -- Only delete scraped jobs, not manually created ones

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  RETURN QUERY SELECT rows_deleted;
END;
$$;

-- Function to check if job needs refresh (older than 6 days)
CREATE OR REPLACE FUNCTION job_needs_refresh(job_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expires_at TIMESTAMPTZ;
BEGIN
  SELECT cache_expires_at
  INTO expires_at
  FROM jobs
  WHERE id = job_id;

  -- Needs refresh if expires within 24 hours or already expired
  RETURN expires_at IS NOT NULL
    AND expires_at < NOW() + INTERVAL '24 hours';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION job_needs_refresh(UUID) TO authenticated, anon;

-- Update existing jobs with scrape timestamp if missing
UPDATE jobs
SET scraped_at = created_at,
    cache_expires_at = created_at + INTERVAL '7 days'
WHERE scraped_at IS NULL
  AND created_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN jobs.source_url IS 'Original job posting URL for attribution (Fair Use)';
COMMENT ON COLUMN jobs.source_name IS 'Source website name (e.g., "Charité", "Vivantes")';
COMMENT ON COLUMN jobs.scraped_at IS 'Timestamp when job was scraped from source';
COMMENT ON COLUMN jobs.cache_expires_at IS '7-day cache expiration for Fair Use compliance';
COMMENT ON COLUMN jobs.attribution_metadata IS 'Additional attribution data (disclaimer, copyright info)';
COMMENT ON FUNCTION cleanup_expired_jobs IS 'Removes job ads older than 7 days (Fair Use cache limit)';
COMMENT ON FUNCTION job_needs_refresh IS 'Checks if job ad cache is about to expire';

-- Optional: Create scheduled job to cleanup expired ads daily
-- Requires pg_cron extension
-- SELECT cron.schedule(
--   'cleanup-expired-jobs',
--   '0 4 * * *',  -- Run at 4 AM daily
--   $$SELECT cleanup_expired_jobs();$$
-- );

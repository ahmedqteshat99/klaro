-- Enhance jobs table with hospital relationship and deduplication

-- Ensure pgcrypto extension exists for digest() function
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add hospital relationship
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL;

-- Add deduplication fields
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS apply_url_hash TEXT,
ADD COLUMN IF NOT EXISTS content_hash TEXT, -- Hash of title + hospital + location + description
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'rss', -- 'rss', 'hospital_scrape', 'manual'
ADD COLUMN IF NOT EXISTS source_identifier TEXT, -- Original ID from source system
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ; -- For detecting when jobs disappear

-- Add validation fields
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS url_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS url_validation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS url_http_status INTEGER,
ADD COLUMN IF NOT EXISTS url_is_dead BOOLEAN DEFAULT false;

-- Create indexes for deduplication
CREATE INDEX IF NOT EXISTS idx_jobs_hospital_id ON jobs(hospital_id) WHERE hospital_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_apply_url_hash ON jobs(apply_url_hash) WHERE apply_url_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_content_hash ON jobs(content_hash) WHERE content_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source);
CREATE INDEX IF NOT EXISTS idx_jobs_last_seen ON jobs(last_seen_at DESC) WHERE is_published = true;

-- Unique constraint: prevent duplicate job URLs
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_unique_apply_url
ON jobs(apply_url_hash)
WHERE is_published = true AND apply_url_hash IS NOT NULL;

-- Composite index for finding similar jobs
CREATE INDEX IF NOT EXISTS idx_jobs_dedup_check
ON jobs(hospital_name, title, location)
WHERE is_published = true;

-- Function to generate apply_url hash
CREATE OR REPLACE FUNCTION generate_url_hash(url TEXT)
RETURNS TEXT AS $$
BEGIN
  IF url IS NULL OR url = '' THEN
    RETURN NULL;
  END IF;

  -- Normalize URL: remove trailing slashes, convert to lowercase, remove common tracking params
  RETURN encode(
    digest(
      convert_to(
        lower(
          regexp_replace(
            regexp_replace(url, '[?&](utm_[^&]*|ref=[^&]*)(&|$)', '', 'g'),
            '/+$', ''
          )
        ),
        'UTF8'
      ),
      'sha256'::text
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate content hash for deduplication
CREATE OR REPLACE FUNCTION generate_job_content_hash(
  p_title TEXT,
  p_hospital TEXT,
  p_location TEXT,
  p_description TEXT
)
RETURNS TEXT AS $$
BEGIN
  -- Create hash from normalized content
  RETURN encode(
    digest(
      convert_to(
        lower(
          normalize_hospital_name(coalesce(p_title, '')) ||
          normalize_hospital_name(coalesce(p_hospital, '')) ||
          normalize_hospital_name(coalesce(p_location, '')) ||
          substring(coalesce(p_description, ''), 1, 500) -- First 500 chars only
        ),
        'UTF8'
      ),
      'sha256'::text
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-populate hash fields
CREATE OR REPLACE FUNCTION set_job_hashes()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate apply_url hash
  IF NEW.apply_url IS NOT NULL THEN
    NEW.apply_url_hash := generate_url_hash(NEW.apply_url);
  END IF;

  -- Generate content hash
  NEW.content_hash := generate_job_content_hash(
    NEW.title,
    NEW.hospital_name,
    NEW.location,
    NEW.description
  );

  -- Set last_seen_at for new/updated jobs
  IF NEW.is_published THEN
    NEW.last_seen_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_job_hashes
  BEFORE INSERT OR UPDATE OF title, hospital_name, location, description, apply_url ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_hashes();

-- Function to find duplicate jobs
CREATE OR REPLACE FUNCTION find_duplicate_job(
  p_apply_url_hash TEXT,
  p_content_hash TEXT
)
RETURNS UUID AS $$
DECLARE
  existing_job_id UUID;
BEGIN
  -- First check: exact URL match (strongest signal)
  IF p_apply_url_hash IS NOT NULL THEN
    SELECT id INTO existing_job_id
    FROM jobs
    WHERE apply_url_hash = p_apply_url_hash
      AND is_published = true
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      RETURN existing_job_id;
    END IF;
  END IF;

  -- Second check: content hash match (same job, possibly different URL)
  IF p_content_hash IS NOT NULL THEN
    SELECT id INTO existing_job_id
    FROM jobs
    WHERE content_hash = p_content_hash
      AND is_published = true
      AND last_seen_at > NOW() - INTERVAL '30 days' -- Only recent jobs
    LIMIT 1;

    IF existing_job_id IS NOT NULL THEN
      RETURN existing_job_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to mark stale jobs as unpublished
CREATE OR REPLACE FUNCTION cleanup_stale_jobs()
RETURNS TABLE(unpublished_count INTEGER) AS $$
DECLARE
  count INTEGER;
BEGIN
  -- Unpublish jobs not seen in 30 days
  WITH updated AS (
    UPDATE jobs
    SET is_published = false,
        updated_at = NOW()
    WHERE is_published = true
      AND last_seen_at < NOW() - INTERVAL '30 days'
      AND source != 'manual' -- Don't auto-unpublish manually created jobs
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO count FROM updated;

  RETURN QUERY SELECT count;
END;
$$ LANGUAGE plpgsql;

-- Backfill hashes for existing jobs (commented out - run manually after migration)
-- Run this SQL manually in Supabase dashboard after migration completes:
-- UPDATE jobs
-- SET
--   apply_url_hash = generate_url_hash(apply_url),
--   content_hash = generate_job_content_hash(title, hospital_name, location, description),
--   last_seen_at = COALESCE(scraped_at, updated_at, created_at)
-- WHERE apply_url_hash IS NULL OR content_hash IS NULL;

-- Comments
COMMENT ON COLUMN jobs.hospital_id IS 'Foreign key to hospitals table for scraped jobs';
COMMENT ON COLUMN jobs.apply_url_hash IS 'SHA256 hash of normalized apply_url for deduplication';
COMMENT ON COLUMN jobs.content_hash IS 'SHA256 hash of job content (title+hospital+location+description) for duplicate detection';
COMMENT ON COLUMN jobs.source IS 'Where this job came from: rss, hospital_scrape, manual';
COMMENT ON COLUMN jobs.source_identifier IS 'Original job ID from source system (e.g., Softgarden job ID)';
COMMENT ON COLUMN jobs.last_seen_at IS 'Last time this job was seen in a scrape (for staleness detection)';
COMMENT ON COLUMN jobs.url_validated IS 'Whether the apply_url was validated and is accessible';
COMMENT ON COLUMN jobs.url_is_dead IS 'Whether the apply_url returns 404 or other error';

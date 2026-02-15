-- RSS Job Import System
-- Adds import workflow status, RSS deduplication fields, and import logs

-- ===============================
-- Import status + RSS fields on jobs table
-- ===============================

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS import_status TEXT
  DEFAULT 'manual'
  CHECK (import_status IN (
    'manual',           -- manually created jobs (existing behavior)
    'pending_review',   -- imported from RSS, awaiting admin review
    'published',        -- approved by admin
    'rejected',         -- admin rejected
    'expired'           -- disappeared from RSS feed
  ));

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS rss_guid TEXT,
ADD COLUMN IF NOT EXISTS rss_content_hash TEXT,
ADD COLUMN IF NOT EXISTS rss_imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rss_last_seen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rss_feed_source TEXT;

-- Unique constraint for deduplication (only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_rss_guid_unique
  ON jobs(rss_guid) WHERE rss_guid IS NOT NULL;

-- Fast lookups by import status
CREATE INDEX IF NOT EXISTS idx_jobs_import_status
  ON jobs(import_status);

-- Backfill existing jobs as 'manual'
UPDATE jobs SET import_status = 'manual' WHERE import_status IS NULL;

-- ===============================
-- Import logs table
-- ===============================

CREATE TABLE IF NOT EXISTS job_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  run_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'imported', 'updated', 'skipped',
    'expired', 'error', 'filtered_out',
    'run_started', 'run_completed'
  )),
  rss_guid TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  job_title TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_import_logs_run ON job_import_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_created ON job_import_logs(created_at DESC);

ALTER TABLE job_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import logs"
  ON job_import_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ===============================
-- Comments
-- ===============================

COMMENT ON COLUMN jobs.import_status IS 'Workflow status for imported jobs: manual, pending_review, published, rejected, expired';
COMMENT ON COLUMN jobs.rss_guid IS 'Unique identifier from RSS feed <guid> for deduplication';
COMMENT ON COLUMN jobs.rss_content_hash IS 'SHA-256 of title+description to detect content changes';
COMMENT ON COLUMN jobs.rss_imported_at IS 'Timestamp of first import from RSS';
COMMENT ON COLUMN jobs.rss_last_seen_at IS 'Timestamp of last appearance in RSS feed';
COMMENT ON COLUMN jobs.rss_feed_source IS 'RSS feed identifier, e.g. stellenmarkt_medizin';
COMMENT ON TABLE job_import_logs IS 'Audit log for all RSS import actions';

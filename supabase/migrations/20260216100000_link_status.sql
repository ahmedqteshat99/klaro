-- Add link health status tracking to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS link_status TEXT DEFAULT 'unchecked'
  CHECK (link_status IN ('unchecked','active','stale','error','unknown')),
ADD COLUMN IF NOT EXISTS link_checked_at TIMESTAMPTZ;

-- Index for filtering by link status
CREATE INDEX IF NOT EXISTS idx_jobs_link_status ON jobs(link_status);

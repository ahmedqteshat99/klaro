-- Track job field backfill attempts so "no-signal" records are not retried forever.

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS field_backfill_status TEXT
  DEFAULT 'pending'
  CHECK (field_backfill_status IN ('pending', 'classified', 'no_signal', 'error'));

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS field_backfill_attempts INTEGER NOT NULL DEFAULT 0;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS field_backfill_last_attempt_at TIMESTAMPTZ;

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS field_backfill_last_error TEXT;

UPDATE jobs
SET field_backfill_status = 'pending'
WHERE field_backfill_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_field_backfill_status
  ON jobs(field_backfill_status);

CREATE INDEX IF NOT EXISTS idx_jobs_field_backfill_attempts
  ON jobs(field_backfill_attempts);

COMMENT ON COLUMN jobs.field_backfill_status IS
  'Backfill state for inferred department/tags: pending, classified, no_signal, error.';
COMMENT ON COLUMN jobs.field_backfill_attempts IS
  'Number of backfill attempts made by backfill-job-fields.';
COMMENT ON COLUMN jobs.field_backfill_last_attempt_at IS
  'Timestamp of most recent backfill-job-fields attempt.';
COMMENT ON COLUMN jobs.field_backfill_last_error IS
  'Last error captured during backfill-job-fields processing.';

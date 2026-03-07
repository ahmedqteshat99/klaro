-- Add duplicate prevention for berlin_hospital_jobs
-- Unique constraint: same hospital + same title = duplicate
CREATE UNIQUE INDEX IF NOT EXISTS idx_berlin_jobs_hospital_title
  ON berlin_hospital_jobs (hospital_id, title)
  WHERE status != 'gone';

-- Also add unique constraint on apply_url per hospital
CREATE UNIQUE INDEX IF NOT EXISTS idx_berlin_jobs_hospital_url
  ON berlin_hospital_jobs (hospital_id, apply_url)
  WHERE apply_url IS NOT NULL;

-- Clean any existing duplicates (keep the oldest entry)
DELETE FROM berlin_hospital_jobs a
USING berlin_hospital_jobs b
WHERE a.hospital_id = b.hospital_id
  AND a.title = b.title
  AND a.id > b.id;

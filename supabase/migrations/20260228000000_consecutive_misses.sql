-- Add consecutive miss tracking for smart expiration
-- consecutive_misses: incremented each scrape run when job is NOT found in feed, reset to 0 when found
-- link_failure_count: incremented each link health check when URL fails, reset to 0 when active

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS consecutive_misses INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS link_failure_count INT DEFAULT 0;

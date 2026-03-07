-- Migration Note: Link Validation Expiration
-- Date: 2026-03-05
--
-- This migration marks the transition from RSS feed-based expiration
-- to link validation-based expiration.
--
-- CHANGES:
-- 1. check-stale-jobs now marks jobs as 'expired' after 3 link failures
-- 2. import-rss-jobs no longer expires jobs based on RSS absence
-- 3. consecutive_misses tracking continues for analytics
--
-- TIMING: Jobs expire after ~3 hours (3 failures × 1 hour check interval)
--
-- No schema changes required - using existing fields:
-- - import_status (already supports 'expired')
-- - link_failure_count (already tracking failures)
-- - link_status (already tracking link health)

SELECT 1; -- No-op migration for documentation

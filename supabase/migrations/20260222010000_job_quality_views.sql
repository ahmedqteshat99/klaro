-- Create views and functions for job quality monitoring

-- =====================
-- Job Quality Metrics View
-- =====================

CREATE OR REPLACE VIEW job_quality_metrics AS
SELECT
  COUNT(*) as total_jobs,
  COUNT(DISTINCT hospital_id) as hospitals_with_jobs,
  COUNT(*) FILTER (WHERE url_validated = true) as validated_jobs,
  COUNT(*) FILTER (WHERE url_validated = false) as unvalidated_jobs,
  COUNT(*) FILTER (WHERE url_is_dead = true) as dead_links,
  COUNT(*) FILTER (WHERE scraped_at IS NOT NULL) as scraped_jobs,
  COUNT(*) FILTER (WHERE source = 'hospital_scrape') as hospital_scraped,
  COUNT(*) FILTER (WHERE source = 'rss') as rss_jobs,
  ROUND(AVG(CASE WHEN url_validated = true THEN 1 ELSE 0 END) * 100, 2) as validation_rate_pct,
  ROUND(AVG(CASE WHEN url_is_dead = true THEN 1 ELSE 0 END) * 100, 2) as dead_link_rate_pct
FROM jobs
WHERE is_published = true;

-- =====================
-- Hospital Scraping Stats
-- =====================

CREATE OR REPLACE VIEW hospital_scraping_stats AS
SELECT
  h.id,
  h.name,
  h.bundesland,
  h.career_page_url,
  h.career_platform,
  h.last_scraped_at,
  h.last_scrape_success,
  COUNT(j.id) as total_jobs_found,
  COUNT(j.id) FILTER (WHERE j.url_validated = true) as valid_jobs,
  COUNT(j.id) FILTER (WHERE j.url_is_dead = true) as dead_jobs,
  MAX(j.scraped_at) as most_recent_job_scraped,
  CASE
    WHEN h.last_scraped_at IS NULL THEN 'never_scraped'
    WHEN h.last_scraped_at < NOW() - INTERVAL '7 days' THEN 'stale'
    WHEN h.last_scrape_success = false THEN 'failed'
    WHEN COUNT(j.id) = 0 THEN 'no_jobs_found'
    ELSE 'healthy'
  END as scrape_status
FROM hospitals h
LEFT JOIN jobs j ON j.hospital_id = h.id AND j.is_published = true
WHERE h.is_active = true
GROUP BY h.id, h.name, h.bundesland, h.career_page_url, h.career_platform, h.last_scraped_at, h.last_scrape_success
ORDER BY h.last_scraped_at DESC NULLS LAST;

-- =====================
-- Duplicate Detection View
-- =====================

CREATE OR REPLACE VIEW duplicate_jobs AS
SELECT
  apply_url_hash,
  content_hash,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at DESC) as job_ids,
  array_agg(title ORDER BY created_at DESC) as titles,
  array_agg(hospital_name ORDER BY created_at DESC) as hospitals
FROM jobs
WHERE is_published = true
  AND (apply_url_hash IS NOT NULL OR content_hash IS NOT NULL)
GROUP BY apply_url_hash, content_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- =====================
-- Stale Jobs View
-- =====================

CREATE OR REPLACE VIEW stale_jobs AS
SELECT
  j.id,
  j.title,
  j.hospital_name,
  j.apply_url,
  j.url_is_dead,
  j.last_seen_at,
  j.scraped_at,
  NOW() - j.last_seen_at as days_since_seen,
  CASE
    WHEN j.url_is_dead = true THEN 'dead_link'
    WHEN j.last_seen_at < NOW() - INTERVAL '30 days' THEN 'very_stale'
    WHEN j.last_seen_at < NOW() - INTERVAL '14 days' THEN 'stale'
    ELSE 'fresh'
  END as staleness_status
FROM jobs j
WHERE j.is_published = true
  AND j.last_seen_at IS NOT NULL
ORDER BY j.last_seen_at ASC;

-- =====================
-- Platform Performance View
-- =====================

CREATE OR REPLACE VIEW platform_performance AS
SELECT
  h.career_platform,
  COUNT(DISTINCT h.id) as hospitals_count,
  COUNT(j.id) as total_jobs,
  ROUND(AVG(COUNT(j.id)) OVER (PARTITION BY h.career_platform), 2) as avg_jobs_per_hospital,
  COUNT(j.id) FILTER (WHERE j.url_validated = true) as validated_jobs,
  ROUND(AVG(CASE WHEN j.url_validated = true THEN 1 ELSE 0 END) * 100, 2) as validation_rate_pct,
  COUNT(DISTINCT h.id) FILTER (WHERE h.last_scrape_success = true) as successful_scrapes,
  COUNT(DISTINCT h.id) FILTER (WHERE h.last_scrape_success = false) as failed_scrapes
FROM hospitals h
LEFT JOIN jobs j ON j.hospital_id = h.id AND j.is_published = true
WHERE h.is_active = true AND h.career_platform IS NOT NULL
GROUP BY h.career_platform
ORDER BY total_jobs DESC;

-- =====================
-- Helper Functions
-- =====================

-- Function to mark stale jobs as inactive
CREATE OR REPLACE FUNCTION mark_stale_jobs_inactive(days_threshold INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE jobs
    SET is_published = false
    WHERE is_published = true
      AND last_seen_at < NOW() - (days_threshold || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO count FROM updated;

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to revalidate dead links
CREATE OR REPLACE FUNCTION get_jobs_needing_revalidation(limit_count INTEGER DEFAULT 100)
RETURNS TABLE(id UUID, apply_url TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT j.id, j.apply_url
  FROM jobs j
  WHERE j.is_published = true
    AND (
      j.url_validated = false
      OR j.url_is_dead = true
      OR j.url_http_status IS NULL
    )
  ORDER BY j.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON VIEW job_quality_metrics IS 'Overall job quality metrics for monitoring';
COMMENT ON VIEW hospital_scraping_stats IS 'Per-hospital scraping performance and job counts';
COMMENT ON VIEW duplicate_jobs IS 'Identifies potential duplicate job postings';
COMMENT ON VIEW stale_jobs IS 'Jobs that haven''t been seen recently in scrapes';
COMMENT ON VIEW platform_performance IS 'Scraping success rates by career platform (Softgarden, Personio, etc)';

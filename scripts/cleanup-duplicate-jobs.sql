-- ========================================
-- Cleanup Script for Duplicate Job URLs
-- ========================================
--
-- This script helps identify and remove duplicate jobs that prevent approval
-- due to unique constraint on apply_url_hash
--
-- STEP 1: Run this query to identify duplicates
-- ========================================

-- Find jobs with duplicate apply_url_hash where one is already published
SELECT
  j1.id as unpublished_job_id,
  j1.title as unpublished_title,
  j1.company as unpublished_company,
  j1.apply_url as unpublished_url,
  j1.created_at as unpublished_created_at,
  j2.id as published_job_id,
  j2.title as published_title,
  j2.company as published_company,
  j2.created_at as published_created_at,
  j1.apply_url_hash
FROM jobs j1
JOIN jobs j2 ON j1.apply_url_hash = j2.apply_url_hash
WHERE
  j1.is_published = false
  AND j2.is_published = true
  AND j1.id != j2.id
  AND j1.apply_url_hash IS NOT NULL
ORDER BY j1.apply_url_hash, j1.created_at;

-- ========================================
-- STEP 2: Review the results above, then choose ONE option below
-- ========================================

-- OPTION A: Delete ALL unpublished duplicates (RECOMMENDED for exact duplicates)
-- ⚠️ WARNING: This will permanently delete unpublished jobs that have the same URL as published ones
-- ⚠️ ONLY run this if you've reviewed the results above and confirmed they're true duplicates

/*
DELETE FROM jobs
WHERE id IN (
  SELECT j1.id
  FROM jobs j1
  JOIN jobs j2 ON j1.apply_url_hash = j2.apply_url_hash
  WHERE
    j1.is_published = false
    AND j2.is_published = true
    AND j1.id != j2.id
    AND j1.apply_url_hash IS NOT NULL
);
*/

-- OPTION B: Mark unpublished duplicates as REJECTED (safer, keeps the data)
-- This keeps the jobs in the database but marks them as rejected

/*
UPDATE jobs
SET import_status = 'rejected'
WHERE id IN (
  SELECT j1.id
  FROM jobs j1
  JOIN jobs j2 ON j1.apply_url_hash = j2.apply_url_hash
  WHERE
    j1.is_published = false
    AND j2.is_published = true
    AND j1.id != j2.id
    AND j1.apply_url_hash IS NOT NULL
);
*/

-- OPTION C: Clear apply_url from duplicates (if you want to keep and potentially edit them)
-- This removes the URL conflict but keeps the jobs for manual review

/*
UPDATE jobs
SET apply_url = NULL, apply_url_hash = NULL
WHERE id IN (
  SELECT j1.id
  FROM jobs j1
  JOIN jobs j2 ON j1.apply_url_hash = j2.apply_url_hash
  WHERE
    j1.is_published = false
    AND j2.is_published = true
    AND j1.id != j2.id
    AND j1.apply_url_hash IS NOT NULL
);
*/

-- ========================================
-- STEP 3: Verify cleanup was successful
-- ========================================

-- This should return 0 rows if all duplicates were cleaned up
SELECT
  j1.id as unpublished_job_id,
  j1.title as unpublished_title,
  j2.id as published_job_id,
  j1.apply_url_hash
FROM jobs j1
JOIN jobs j2 ON j1.apply_url_hash = j2.apply_url_hash
WHERE
  j1.is_published = false
  AND j2.is_published = true
  AND j1.id != j2.id
  AND j1.apply_url_hash IS NOT NULL;

-- ========================================
-- STEP 4: Check how many pending jobs remain
-- ========================================

SELECT COUNT(*) as pending_jobs_count
FROM jobs
WHERE import_status = 'pending_review';

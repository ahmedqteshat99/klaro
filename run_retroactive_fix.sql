-- Retroactive Fix: Clear bad locations and reset link status
-- Run this in Supabase SQL Editor

-- Step 1: Clear locations that contain medical terms instead of city names
UPDATE jobs
SET location = NULL
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (
    location IS NULL
    OR location ~* '(radiologie|kardiologie|chirurgie|anästhesie|anasthesie|neurologie|gynäkologie|gynakologie|pädiatrie|padiatrie|psychiatrie|orthopädie|orthopadie|urologie|dermatologie|onkologie|pneumologie|nephrologie|gastroenterologie|innere medizin|intensivmedizin|notaufnahme|allgemeinmedizin|nuklearmedizin|pathologie|hämatologie|hamatologie|endokrinologie|rheumatologie|geriatrie|neonatologie|weiterbildung|facharzt|oberarzt|assistenzarzt|gefäßchirurgie|unfallchirurgie|viszeralchirurgie|herzchirurgie|thoraxchirurgie|kinderchirurgie|hals-nasen-ohrenheilkunde|augenheilkunde|palliativmedizin|arbeitsmedizin|rechtsmedizin|mikrobiologie|virologie|transfusionsmedizin|strahlentherapie|laboratoriumsmedizin|klinik|klinikum|krankenhaus|hospital|praxis|medizinisches zentrum|gesundheitszentrum)'
  );

-- Step 2: Reset link status for jobs with aggregator URLs so they can be resolved
UPDATE jobs
SET
    link_status = 'unchecked',
    link_checked_at = NULL,
    link_failure_count = 0
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (
    apply_url LIKE '%stellenmarkt.de%' OR
    apply_url LIKE '%aerzteblatt.de%' OR
    apply_url LIKE '%praktischarzt.de%' OR
    apply_url LIKE '%ethimedis.de%'
  );

-- Step 3: Show statistics
SELECT
  'Total jobs after cutoff' as metric,
  COUNT(*) as count
FROM jobs
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')

UNION ALL

SELECT
  'Jobs with missing location' as metric,
  COUNT(*) as count
FROM jobs
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (location IS NULL OR location = '')

UNION ALL

SELECT
  'Jobs with aggregator URLs' as metric,
  COUNT(*) as count
FROM jobs
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (
    apply_url LIKE '%stellenmarkt.de%' OR
    apply_url LIKE '%aerzteblatt.de%' OR
    apply_url LIKE '%praktischarzt.de%' OR
    apply_url LIKE '%ethimedis.de%'
  )

UNION ALL

SELECT
  'Jobs ready for backfill (unchecked status)' as metric,
  COUNT(*) as count
FROM jobs
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND link_status = 'unchecked';

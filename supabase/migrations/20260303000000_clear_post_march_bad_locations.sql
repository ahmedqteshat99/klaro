-- Clear bad locations and reset link status for jobs imported after March 1st, 2026 19:49
-- This prepares jobs for proper backfill via AI and existing import logic

-- Clear locations that contain medical terms instead of city names
UPDATE jobs
SET location = NULL
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (
    location IS NULL
    OR location ~* '(radiologie|kardiologie|chirurgie|anästhesie|anasthesie|neurologie|gynäkologie|gynakologie|pädiatrie|padiatrie|psychiatrie|orthopädie|orthopadie|urologie|dermatologie|onkologie|pneumologie|nephrologie|gastroenterologie|innere medizin|intensivmedizin|notaufnahme|allgemeinmedizin|nuklearmedizin|pathologie|hämatologie|hamatologie|endokrinologie|rheumatologie|geriatrie|neonatologie|weiterbildung|facharzt|oberarzt|assistenzarzt|gefäßchirurgie|unfallchirurgie|viszeralchirurgie|herzchirurgie|thoraxchirurgie|kinderchirurgie|hals-nasen-ohrenheilkunde|augenheilkunde|palliativmedizin|arbeitsmedizin|rechtsmedizin|mikrobiologie|virologie|transfusionsmedizin|strahlentherapie|laboratoriumsmedizin|klinik|klinikum|krankenhaus|hospital|praxis|medizinisches zentrum|gesundheitszentrum)'
  );

-- Reset link status for jobs with aggregator URLs so they can be resolved
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

-- Report statistics
DO $$
DECLARE
    locations_cleared INT;
    urls_reset INT;
BEGIN
    SELECT COUNT(*) INTO locations_cleared
    FROM jobs
    WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
      AND location IS NULL;

    SELECT COUNT(*) INTO urls_reset
    FROM jobs
    WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
      AND link_status = 'unchecked';

    RAISE NOTICE 'Locations cleared: %', locations_cleared;
    RAISE NOTICE 'URLs reset for resolution: %', urls_reset;
END $$;

-- ══════════════════════════════════════════════════════════════════
-- Fix All Job Import Sources: Clear Bad Locations + Reset Link Status
-- ══════════════════════════════════════════════════════════════════
--
-- Problem: All 4 RSS import sources (Stellenmarkt, Ärzteblatt,
-- PraktischArzt, Ethimedis) have two data quality issues:
--
-- 1. **Medical department names in location field**: The location
--    field contains department names like "Innere Medizin",
--    "Kardiologie", "Chirurgie" instead of cities.
--
-- 2. **Aggregator URLs in apply_url**: Jobs link to aggregator
--    listing pages instead of hospital application URLs.
--
-- This migration clears bad locations retroactively and resets link
-- status for jobs with aggregator URLs so they can be re-resolved.
-- ══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════
-- PART 1: Clear bad locations (medical department names)
-- ══════════════════════════════════════════════════════════════════

UPDATE jobs
SET location = NULL
WHERE rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (
    location ~* '(radiologie|kardiologie|chirurgie|anästhesie|anasthesie|neurologie|gynäkologie|gynakologie|pädiatrie|padiatrie|psychiatrie|orthopädie|orthopadie|urologie|dermatologie|onkologie|pneumologie|nephrologie|gastroenterologie|innere medizin|intensivmedizin|notaufnahme|allgemeinmedizin|nuklearmedizin|pathologie|hämatologie|hamatologie|endokrinologie|rheumatologie|geriatrie|neonatologie|weiterbildung|facharzt|oberarzt|assistenzarzt|gefäßchirurgie|unfallchirurgie|viszeralchirurgie|herzchirurgie|thoraxchirurgie|kinderchirurgie|hals-nasen-ohrenheilkunde|augenheilkunde|palliativmedizin|arbeitsmedizin|rechtsmedizin|mikrobiologie|virologie|transfusionsmedizin|strahlentherapie|laboratoriumsmedizin|klinik|klinikum|krankenhaus|hospital|praxis|medizinisches zentrum|gesundheitszentrum)'
  );

-- ══════════════════════════════════════════════════════════════════
-- PART 2: Reset link status for jobs with aggregator URLs
-- ══════════════════════════════════════════════════════════════════

UPDATE jobs
SET
    link_status = 'unchecked',
    link_checked_at = NULL,
    link_failure_count = 0
WHERE rss_feed_source IN ('stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'ethimedis')
  AND (
    apply_url LIKE '%stellenmarkt.de%' OR
    apply_url LIKE '%aerzteblatt.de%' OR
    apply_url LIKE '%praktischarzt.de%' OR
    apply_url LIKE '%ethimedis.de%'
  );

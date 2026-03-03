# Retroactive Fix Implementation Guide

## Overview

This guide covers the implementation of retroactive fixes for jobs imported after **March 1st, 2026, 19:49** that have:
- Aggregator URLs instead of employer URLs
- Missing or incorrect locations (medical department names instead of cities)

## What Was Implemented

### 1. SQL Migration for Data Cleanup
**File**: `supabase/migrations/20260303000000_clear_post_march_bad_locations.sql`

Clears bad location data and resets link status for affected jobs. This prepares them for proper backfill.

### 2. Edge Function for Batch Processing
**File**: `supabase/functions/fix-imported-jobs/index.ts`
**Status**: ✅ Deployed to Supabase

Features:
- Batch URL resolution (calls Scrapling service to get employer URLs)
- Location extraction using multiple strategies
- Admin or CRON authentication
- Progress logging and statistics

### 3. Manual SQL Script
**File**: `run_retroactive_fix.sql`

Can be run directly in Supabase SQL Editor for immediate cleanup.

## How to Run the Fix

### Option 1: Manual SQL Cleanup (Recommended First Step)

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/sfmgdvjwmoxoeqmcarbv/sql
2. Paste the contents of `run_retroactive_fix.sql`
3. Execute the script
4. Review the statistics at the end

This will:
- Clear all bad locations (NULL them out)
- Reset link status to 'unchecked' for jobs with aggregator URLs
- Show counts of affected jobs

### Option 2: Edge Function (For Batch URL Resolution)

**Prerequisites**:
- Configure CRON_SECRET in Supabase environment variables, OR
- Use admin JWT token for authentication

**Via CRON Secret**:
```bash
curl -X POST "https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/fix-imported-jobs" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -d '{}'
```

**Via Admin Token**:
```bash
curl -X POST "https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/fix-imported-jobs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{}'
```

The Edge Function will:
- Process up to 500 jobs per run
- Resolve employer URLs via Scrapling service
- Extract locations from hospital_name, title, and description
- Return detailed statistics

### Option 3: Let RSS Import Handle It (Incremental)

After running the SQL cleanup (Option 1), you can simply trigger regular RSS imports:
- The `import-rss-jobs` Edge Function will backfill URLs (15 per run)
- The `backfill-locations` Edge Function will extract locations
- This is slower but uses existing, tested logic

## Recommended Workflow

**Step 1**: Run manual SQL cleanup
```bash
# Copy run_retroactive_fix.sql contents to Supabase SQL Editor and execute
```

**Step 2**: Trigger multiple RSS imports to backfill URLs incrementally
```bash
# Via admin panel or:
curl -X POST "https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -d '{"source": "stellenmarkt_medizin"}'
```

**Step 3**: Run backfill-locations to extract cities
```bash
curl -X POST "https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/backfill-locations" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

**Step 4**: Monitor progress
```sql
-- Check remaining jobs with aggregator URLs
SELECT COUNT(*)
FROM jobs
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
  AND (apply_url LIKE '%stellenmarkt.de%' OR apply_url LIKE '%aerzteblatt.de%');

-- Check location coverage
SELECT
  rss_feed_source,
  COUNT(*) as total,
  SUM(CASE WHEN location IS NOT NULL AND location != '' THEN 1 ELSE 0 END) as with_location,
  ROUND(100.0 * SUM(CASE WHEN location IS NOT NULL AND location != '' THEN 1 ELSE 0 END) / COUNT(*), 2) as coverage_pct
FROM jobs
WHERE rss_imported_at > '2026-03-01 19:49:00+00'::TIMESTAMPTZ
GROUP BY rss_feed_source;
```

## Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `supabase/migrations/20260303000000_clear_post_march_bad_locations.sql` | Created | SQL migration for data cleanup |
| `supabase/functions/fix-imported-jobs/index.ts` | Deployed | Edge Function for batch processing |
| `run_retroactive_fix.sql` | Created | Manual SQL script for cleanup |
| `RETROACTIVE_FIX_GUIDE.md` | Created | This guide |

## Success Criteria

- [ ] All jobs have employer URLs (not aggregator URLs) OR link_status = 'unchecked'
- [ ] No jobs have medical department names in location field
- [ ] >70% of jobs have valid city locations
- [ ] Edge Function can be run safely multiple times without duplicating work

## Next Steps

1. **Immediate**: Run `run_retroactive_fix.sql` in Supabase SQL Editor
2. **Short-term**: Set up CRON_SECRET environment variable in Supabase for automated Edge Function runs
3. **Ongoing**: Monitor location coverage and URL resolution success rates
4. **Future**: Consider adding AI fallback to other scrapers (Stellenmarkt, Ärzteblatt, PraktischArzt)

## Troubleshooting

**SQL migration won't deploy via `supabase db push`**:
- Use the manual SQL script instead (`run_retroactive_fix.sql`)
- The migration file is preserved for documentation

**Edge Function returns 401**:
- CRON_SECRET is not configured in Supabase environment variables
- Use admin JWT authentication instead
- Or configure CRON_SECRET in project settings

**Low location coverage after fix**:
- Run `backfill-locations` Edge Function multiple times
- Consider scraping job detail pages for more context
- Ethimedis jobs may have inherently limited location data

## Cost Impact

- SQL cleanup: Free (one-time database updates)
- Edge Function URL resolution: ~15s per URL × number of jobs (~$0 with Supabase free tier)
- Scrapling service calls: Minimal (OpenAI API only used for AI fallbacks when enabled)
- Expected total cost: <$1 for full retroactive fix

## Timeline

- **Phase 1 (Immediate)**: SQL cleanup - 1 minute
- **Phase 2 (Days 1-3)**: Incremental URL backfill via normal imports - 3 days at 15 URLs per import
- **Phase 3 (Week 1)**: Location extraction and validation - ongoing via backfill-locations
- **Target**: >90% data quality within 1 week

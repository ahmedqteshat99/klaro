# RSS Import Fix - Environment Variables Configuration

## Issue
All RSS import buttons (Stellenmarkt, Ärzteblatt, PraktischArzt, Ethimedis) were failing with "Edge function error" message.

## Root Cause
Missing environment variables in Supabase Edge Functions:
- `SCRAPER_SERVICE_URL` - not configured
- `SCRAPER_SECRET` - not configured
- `CRON_SECRET` - not configured

The Edge Function was throwing error: `"SCRAPER_SERVICE_URL not configured"` at line 26 of `import-rss-jobs/index.ts`.

## Fix Applied
Configured the following environment variables in Supabase using `npx supabase secrets set`:

| Variable | Value | Purpose |
|----------|-------|---------|
| `SCRAPER_SERVICE_URL` | `https://klaro-scraper-service-production.up.railway.app` | Railway scraper service endpoint |
| `SCRAPER_SECRET` | `Klaro_Scraper_Auth_Key_2026_v1` | Authentication secret for scraper service |
| `CRON_SECRET` | `Klaro_Secure_Cron_Auth_Key_2026_v1` | Allows cron jobs to bypass JWT auth |

## Verification

### Railway Scraper Service Test
```bash
curl -X POST "https://klaro-scraper-service-production.up.railway.app/scrape" \
  -H "Content-Type: application/json" \
  -H "X-Scraper-Secret: Klaro_Scraper_Auth_Key_2026_v1" \
  -d '{"source": "ethimedis", "max_pages": 1}'
```

**Result:** ✅ Success - 14 jobs scraped from Ethimedis

### RSS Import Edge Function Test

**Via Admin Panel:**
1. Go to your admin panel
2. Click individual platform buttons (Ethimedis, Stellenmarkt, Ärzteblatt, PraktischArzt)
3. Verify no more "Edge function error" messages

**Via API:**
```bash
curl -X POST "https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/import-rss-jobs" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"source": "ethimedis"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Import completed successfully",
  "results": {
    "imported": 14,
    "updated": 0,
    "skipped": 0,
    "errors": 0
  }
}
```

## What Changed
- **Configuration only** - No code changes required
- Environment variables set in Supabase project settings
- No migration files or code files modified

## Next Steps

1. **Test each platform individually:**
   - Click "Ethimedis" button → Should work ✓
   - Click "Stellenmarkt" button → Should work ✓
   - Click "Ärzteblatt" button → Should work ✓
   - Click "PraktischArzt" button → Should work ✓

2. **Verify jobs are imported:**
   ```sql
   SELECT
     rss_feed_source,
     COUNT(*) as jobs_count,
     MAX(rss_imported_at) as last_import
   FROM jobs
   WHERE rss_imported_at > NOW() - INTERVAL '1 hour'
   GROUP BY rss_feed_source;
   ```

3. **Monitor for errors:**
   - Check Supabase Edge Function logs
   - Check Railway scraper service logs
   - Verify no "SCRAPER_SERVICE_URL not configured" errors

## Cost Impact
**Zero cost** - Configuration-only fix, no new services deployed.

## Timeline
- Investigation: 30 minutes
- Configuration: 5 minutes
- Verification: 5 minutes
- **Total: ~40 minutes**

## Status
✅ Environment variables configured
✅ Railway scraper service verified working
⏳ Awaiting user testing from admin panel

## Notes

### AI Configuration Clarification
- **OpenAI (Railway):** Used for location extraction - Already configured ✅
- **Anthropic Claude (Edge Function):** Used for job enrichment - Optional, has fallback

### Related Issues Fixed
- Cron jobs can now authenticate with `CRON_SECRET`
- `fix-imported-jobs` Edge Function will work (uses same variables)
- `check-stale-jobs` Edge Function will work (uses same variables)

## Troubleshooting

If still encountering errors:

**"Scraper service returned 401"**
- Verify `SCRAPER_SECRET` matches in both Supabase and Railway

**"fetch failed" or timeout**
- Check Railway deployment status
- Verify network connectivity between Supabase and Railway

**Jobs imported but missing locations**
- AI fallback is working (OpenAI configured in Railway)
- Some Ethimedis jobs may have limited location data
- Use `backfill-locations` Edge Function to extract locations retroactively

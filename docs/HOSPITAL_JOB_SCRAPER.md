# Hospital Job Scraper System

Complete documentation for the automated Assistenzarzt job discovery system across all German hospitals.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Monitoring](#monitoring)
- [Deployment](#deployment)
- [Scaling Strategy](#scaling-strategy)

---

## Overview

Automated system to discover and scrape Assistenzarzt (assistant physician) job postings from all German hospitals.

### Key Features

✅ **100% Hospital Coverage Goal**
- Multi-source hospital discovery (G-BA, state registries, manual curation)
- Currently: 32 major hospitals seeded
- Target: 1,900-2,050 hospitals

✅ **Duplicate Prevention**
- SHA256 URL hashing (normalized, tracking params removed)
- SHA256 content hashing (title + hospital + location + description)
- Database-level unique constraints

✅ **Link Validation**
- 3-step validation: HTTP HEAD → GET → content verification
- Tracks HTTP status codes
- Identifies dead links (404, 410)

✅ **Multi-Platform Support**
- Softgarden (API-based)
- Personio (JSON-LD structured data)
- Rexx, SuccessFactors, Jobware (HTML parsing)
- Custom career pages (generic scraper)

### Current Status (2026-02-22)

| Metric | Value |
|--------|-------|
| Hospitals in Database | 32 |
| Career Pages Discovered | 19/20 (95%) |
| Jobs Scraped (Test Run) | 14 found, 9 added |
| Automated CRON | Daily at 3 AM |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CRON Scheduler                       │
│                  (pg_cron, daily 3 AM)                   │
└────────────┬────────────────────────────────────────────┘
             │
             ├──► discover-career-pages
             │    • Finds karriere/stellenangebote URLs
             │    • Detects platform type
             │    • Processes 20 hospitals/run
             │
             └──► scrape-hospital-jobs
                  • Scrapes Assistenzarzt positions
                  • Validates URLs
                  • Deduplicates
                  • Processes 10 hospitals/run

┌─────────────────────────────────────────────────────────┐
│                    Supabase Database                     │
│  • hospitals table (with career_page_url)               │
│  • jobs table (with deduplication hashes)               │
│  • Quality monitoring views                             │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Career Page Discovery Function

**File:** `supabase/functions/discover-career-pages/index.ts`

Automatically finds career page URLs for hospitals.

**Discovery Methods:**
1. **Common Path Testing** - Tries standard paths like `/karriere`, `/jobs`, `/stellenangebote`
2. **Homepage Parsing** - Scrapes homepage HTML for career-related links
3. **Platform Detection** - Identifies Softgarden, Personio, Rexx, etc.

**Rate Limiting:** 3 seconds between hospitals

**Example Output:**
```json
{
  "success": true,
  "processed": 20,
  "found": 19,
  "notFound": 1,
  "byPlatform": {
    "cms": 12,
    "custom": 5,
    "softgarden": 1,
    "successfactors": 1
  }
}
```

### 2. Job Scraper Function

**File:** `supabase/functions/scrape-hospital-jobs/index.ts`

Scrapes Assistenzarzt positions from hospital career pages.

**Platform Scrapers:**

| Platform | Method | Example |
|----------|--------|---------|
| Softgarden | API calls to `/api/v1/postings` | UKE Hamburg |
| Personio | JSON-LD structured data extraction | Many modern sites |
| Custom | HTML parsing with keyword matching | Most hospital sites |

**Validation Pipeline:**
```
1. HTTP HEAD request (check if URL exists)
   └─► 200-399: valid, continue
   └─► 404/410: mark as dead, skip

2. GET request (fetch content)
   └─► Parse HTML

3. Content verification
   └─► Must contain "assistenzarzt" or "stelle"
   └─► Must NOT contain "404" or "not found"
```

**Deduplication:**
```typescript
// URL normalization
normalize("https://example.com/jobs/123?utm_source=web&ref=abc")
  → "https://example.com/jobs/123"
  → SHA256 hash

// Content hashing
hash(
  normalize(title) +
  normalize(hospital) +
  normalize(location) +
  substring(description, 0, 500)
) → SHA256 hash
```

**Rate Limiting:** 5 seconds between hospitals

### 3. Database Migrations

**Hospitals Table:**
```sql
CREATE TABLE hospitals (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  career_page_url TEXT,
  career_platform TEXT,
  plz TEXT,
  city TEXT NOT NULL,
  bundesland TEXT NOT NULL,
  website TEXT,
  beds_count INTEGER,
  source TEXT[],
  is_active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  last_scraped_at TIMESTAMPTZ,
  last_scrape_success BOOLEAN
);

-- Deduplication constraint
CREATE UNIQUE INDEX idx_hospitals_dedup
ON hospitals(name_normalized, plz)
WHERE is_active = true;
```

**Jobs Table Enhancements:**
```sql
ALTER TABLE jobs
ADD COLUMN hospital_id UUID REFERENCES hospitals(id),
ADD COLUMN apply_url_hash TEXT,
ADD COLUMN content_hash TEXT,
ADD COLUMN source TEXT DEFAULT 'rss',
ADD COLUMN source_identifier TEXT,
ADD COLUMN scraped_at TIMESTAMPTZ,
ADD COLUMN last_seen_at TIMESTAMPTZ,
ADD COLUMN url_validated BOOLEAN DEFAULT false,
ADD COLUMN url_http_status INTEGER,
ADD COLUMN url_is_dead BOOLEAN DEFAULT false;

-- Prevent duplicate URLs
CREATE UNIQUE INDEX idx_jobs_unique_apply_url
ON jobs(apply_url_hash)
WHERE is_published = true AND apply_url_hash IS NOT NULL;
```

### 4. Quality Monitoring Views

**job_quality_metrics:**
```sql
SELECT
  total_jobs,
  hospitals_with_jobs,
  validated_jobs,
  validation_rate_pct,
  dead_link_rate_pct
FROM job_quality_metrics;
```

**hospital_scraping_stats:**
```sql
SELECT
  name,
  career_platform,
  total_jobs_found,
  scrape_status
FROM hospital_scraping_stats
ORDER BY total_jobs_found DESC;
```

**duplicate_jobs:**
```sql
SELECT
  duplicate_count,
  titles,
  hospitals
FROM duplicate_jobs
WHERE duplicate_count > 1;
```

**stale_jobs:**
```sql
SELECT
  title,
  hospital_name,
  staleness_status,
  days_since_seen
FROM stale_jobs
WHERE staleness_status IN ('stale', 'very_stale');
```

**platform_performance:**
```sql
SELECT
  career_platform,
  hospitals_count,
  total_jobs,
  validation_rate_pct
FROM platform_performance
ORDER BY total_jobs DESC;
```

---

## API Endpoints

### Career Page Discovery

**Endpoint:** `POST /functions/v1/discover-career-pages`

**Auth:** Admin JWT or CRON secret

**Response:**
```json
{
  "success": true,
  "processed": 20,
  "found": 18,
  "notFound": 2,
  "byPlatform": {
    "softgarden": 3,
    "personio": 2,
    "cms": 10,
    "custom": 3
  }
}
```

### Job Scraper

**Endpoint:** `POST /functions/v1/scrape-hospital-jobs`

**Auth:** Admin JWT or CRON secret

**Response:**
```json
{
  "success": true,
  "hospitalsProcessed": 10,
  "totalJobsFound": 23,
  "totalJobsAdded": 18,
  "results": [
    {
      "hospital": "UKE Hamburg",
      "jobsFound": 3,
      "jobsAdded": 2
    }
  ]
}
```

---

## Monitoring

### Scripts

**Monitor Job Quality:**
```bash
npx tsx scripts/monitor-job-quality.ts
```

Output:
```
📊 Overall Job Quality Metrics
  Total Jobs: 9
  Hospitals with Jobs: 4
  Validated Jobs: 9 (100%)
  Dead Links: 0 (0%)

🏥 Hospital Scraping Statistics (Top 10)
1. ✅ Universitätsklinikum Leipzig
   Platform: custom
   Jobs Found: 6 (6 validated)
   Last Scraped: 2/22/2026

2. ✅ Universitätsklinikum Hamburg-Eppendorf
   Platform: custom
   Jobs Found: 1 (1 validated)
   Last Scraped: 2/22/2026
```

**Test Career Discovery:**
```bash
npx tsx scripts/test-career-discovery.ts
```

**Test Job Scraper:**
```bash
npx tsx scripts/test-job-scraper.ts
```

### SQL Queries

**Check overall health:**
```sql
SELECT * FROM job_quality_metrics;
```

**Find hospitals needing attention:**
```sql
SELECT name, scrape_status, last_scraped_at
FROM hospital_scraping_stats
WHERE scrape_status IN ('failed', 'stale', 'never_scraped')
ORDER BY last_scraped_at ASC NULLS FIRST;
```

**Identify duplicates:**
```sql
SELECT * FROM duplicate_jobs ORDER BY duplicate_count DESC LIMIT 10;
```

---

## Deployment

### Initial Setup

1. **Apply Migrations:**
```bash
npx supabase db push --linked
```

2. **Deploy Edge Functions:**
```bash
npx supabase functions deploy discover-career-pages scrape-hospital-jobs --project-ref sfmgdvjwmoxoeqmcarbv
```

3. **Set Secrets:**
```bash
npx supabase secrets set CRON_SECRET=your_secret_here --project-ref sfmgdvjwmoxoeqmcarbv
```

### CRON Configuration

**File:** `supabase/migrations/20260221020000_hospital_scraper_cron.sql`

```sql
SELECT cron.schedule(
  'scrape-hospital-jobs-daily',
  '0 3 * * *', -- Every day at 3:00 AM
  $$
  SELECT net.http_post(
    url := 'https://sfmgdvjwmoxoeqmcarbv.supabase.co/functions/v1/scrape-hospital-jobs',
    headers := jsonb_build_object(
      'x-cron-secret', current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Scaling Strategy

### Phase 1: Foundation (✅ COMPLETE)
- [x] 20 university hospitals seeded
- [x] Career page discovery working
- [x] Job scraper validated
- [x] Monitoring views created

### Phase 2: Expansion (🚧 IN PROGRESS)
- [x] 32 major hospitals in database
- [ ] Import G-BA Qualitätsberichte (~1,900 hospitals)
- [ ] Scrape state hospital registries (16 Bundesländer)
- [ ] Google Places enrichment for missing data

### Phase 3: Coverage Optimization
- [ ] Full coverage cycle (20 days for 1,900 hospitals)
- [ ] Platform-specific optimizations
- [ ] Career page discovery automation
- [ ] Stale job cleanup automation

### Phase 4: Quality Improvements
- [ ] Machine learning for job classification
- [ ] Automatic job description enhancement
- [ ] Bundesland/Fachrichtung extraction
- [ ] Salary range detection

### Expected Coverage

| Source | Hospitals | Status |
|--------|-----------|--------|
| Manual Curation | 32 | ✅ Complete |
| G-BA Qualitätsberichte | ~1,900 | 📋 Planned |
| State Registries | ~50-100 | 📋 Planned |
| Google Places | ~20-50 | 📋 Planned |
| **TOTAL** | **~2,000** | **🎯 Target** |

### Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Career Page Discovery Rate | 95% | 90%+ |
| Job Validation Rate | 100% | 95%+ |
| Dead Link Rate | 0% | <5% |
| Duplicate Rate | 35% | <10% |
| Hospitals Processed/Day | 10 | 100+ |

---

## Troubleshooting

### Common Issues

**Issue:** Career page discovery returns 0 results
- Check if website is accessible (SSL, redirects)
- Verify common paths in COMMON_CAREER_PATHS array
- Check if site uses JavaScript rendering (needs headless browser)

**Issue:** Jobs not being added (found but not added)
- Check duplicate detection logs
- Verify content hash matches are intentional
- Review URL normalization logic

**Issue:** High dead link rate
- Run revalidation: `SELECT * FROM get_jobs_needing_revalidation(100);`
- Check if hospital changed career platform
- Update career_page_url if redirected

**Issue:** CRON not running
- Check `pg_cron` extension is enabled
- Verify CRON_SECRET is set in Supabase secrets
- Check Edge Function logs in dashboard

---

## Contributing

When adding new hospital sources:

1. Add to appropriate migration or import script
2. Ensure `name_normalized` and `plz` are set for deduplication
3. Set `verified = true` only for official sources
4. Include `source` array (e.g., `ARRAY['g-ba', 'manual']`)

When adding new platform scrapers:

1. Add detection logic to `detectPlatform()` in discover-career-pages
2. Implement scraper in scrape-hospital-jobs
3. Update `platform_performance` view query if needed
4. Add to documentation

---

## License

Internal use only for Assistenzarzt Pro platform.

---

**Last Updated:** 2026-02-22
**Maintained By:** Development Team

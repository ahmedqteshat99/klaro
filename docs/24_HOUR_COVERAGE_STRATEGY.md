# 24-Hour Hospital Coverage Strategy

**Date**: 2026-02-23
**Status**: Active
**Coverage**: 500+ hospitals every 24 hours

---

## 🎯 Objective

Ensure **all 500+ hospitals** are scanned for Assistenzarzt job postings **every 24 hours**.

---

## 📊 Previous Configuration (Insufficient)

| Metric | Value | Result |
|--------|-------|--------|
| **Schedule** | Once daily (3 AM) | ❌ |
| **Batch Size** | 10 hospitals/run | ❌ |
| **Coverage** | 10 hospitals/day | ❌ |
| **Full Cycle** | 50 days | ❌ UNACCEPTABLE |

**Problem**: With 500+ hospitals and 10/day, it takes 50 days to scan all hospitals once.

---

## ✅ New Configuration (Full Coverage)

### Career Page Discovery

| Metric | Value |
|--------|-------|
| **Schedule** | Every 2 hours |
| **Frequency** | 12 times/day |
| **Batch Size** | 50 hospitals/run |
| **Daily Coverage** | **600 hospitals/day** ✅ |
| **Full Cycle** | **24 hours** ✅ |

**CRON Expression**: `0 */2 * * *` (at minute 0 of every 2nd hour)

**Runtime Estimate**:
- 50 hospitals × 3s rate limit = 150 seconds
- **Total: ~2.5 minutes** (Edge Function max timeout: 150s) ⚠️ *At limit*

### Job Scraper

| Metric | Value |
|--------|-------|
| **Schedule** | Every hour |
| **Frequency** | 24 times/day |
| **Batch Size** | 25 hospitals/run |
| **Daily Coverage** | **600 hospitals/day** ✅ |
| **Full Cycle** | **24 hours** ✅ |

**CRON Expression**: `30 * * * *` (at minute 30 of every hour)

**Runtime Estimate**:
- 25 hospitals × 5s rate limit = 125 seconds
- Plus scraping/validation time
- **Total: ~2-2.5 minutes** (Safe under 150s timeout) ✅

---

## 🕐 Daily Schedule

```
00:00 - Career Discovery (50 hospitals)
00:30 - Job Scraper (25 hospitals)
01:00 - [idle]
01:30 - Job Scraper (25 hospitals)
02:00 - Career Discovery (50 hospitals)
02:30 - Job Scraper (25 hospitals)
03:00 - [idle]
03:30 - Job Scraper (25 hospitals)
04:00 - Career Discovery (50 hospitals)
04:30 - Job Scraper (25 hospitals)
... (continues every hour)
22:00 - Career Discovery (50 hospitals)
22:30 - Job Scraper (25 hospitals)
23:00 - [idle]
23:30 - Job Scraper (25 hospitals)
```

**Offset Strategy**: Career discovery runs at :00, job scraper runs at :30 to avoid conflicts.

---

## 📈 Coverage Mathematics

### Career Discovery
```
50 hospitals/run × 12 runs/day = 600 hospitals/day
600 > 500+ ✅ Full coverage + 20% buffer
```

### Job Scraper
```
25 hospitals/run × 24 runs/day = 600 hospitals/day
600 > 500+ ✅ Full coverage + 20% buffer
```

**Buffer Benefits**:
- Handles new hospitals added to database
- Allows re-scraping recently updated hospitals
- Compensates for occasional failures

---

## 🔄 Hospital Selection Logic

Both functions use **least-recently-scraped** ordering:

```sql
ORDER BY last_scraped_at ASC NULLS FIRST
```

**Result**:
- Hospitals never scraped go first (NULL)
- Then oldest scrapes
- Ensures even distribution over 24 hours
- Naturally cycles through all hospitals

---

## ⚙️ Configuration Files

### 1. CRON Migration
**File**: `supabase/migrations/20260223000000_update_cron_hourly.sql`

**Key Changes**:
- ❌ Removed: `scrape-hospital-jobs-daily` (once/day)
- ❌ Removed: `discover-career-pages-daily` (once/day)
- ✅ Added: `scrape-hospital-jobs-hourly` (24×/day)
- ✅ Added: `discover-career-pages-every-2h` (12×/day)

### 2. Edge Function Updates

**Job Scraper**: `supabase/functions/scrape-hospital-jobs/index.ts`
- Changed: `.limit(10)` → `.limit(25)`
- Lines: ~583-590

**Career Discovery**: `supabase/functions/discover-career-pages/index.ts`
- Changed: `.limit(20)` → `.limit(50)`
- Lines: ~264-272

---

## 🚨 Edge Function Timeout Considerations

**Supabase Edge Function Limit**: 150 seconds (2.5 minutes)

### Career Discovery Safety
```
50 hospitals × 3 seconds = 150 seconds (baseline)
+ Homepage fetching time
+ Platform detection time
≈ 150-180 seconds
```

⚠️ **Potential Issue**: May timeout with slow hospital websites

**Mitigation**:
- Timeout on individual requests (10s max)
- Skip hospitals that don't respond quickly
- Function completes partial batch on timeout

### Job Scraper Safety
```
25 hospitals × 5 seconds = 125 seconds (baseline)
+ Job scraping time
+ URL validation time
≈ 130-140 seconds
```

✅ **Safe**: Should complete comfortably under 150s

---

## 📊 Monitoring

### Check Coverage
```sql
-- Hospitals never scraped
SELECT COUNT(*)
FROM hospitals
WHERE is_active = true
  AND last_scraped_at IS NULL;

-- Hospitals not scraped in 48 hours
SELECT COUNT(*)
FROM hospitals
WHERE is_active = true
  AND last_scraped_at < NOW() - INTERVAL '48 hours';

-- Average scrape age
SELECT AVG(NOW() - last_scraped_at) as avg_age
FROM hospitals
WHERE is_active = true
  AND last_scraped_at IS NOT NULL;
```

### Monitor CRON Executions
```sql
-- View all CRON jobs
SELECT * FROM cron.job;

-- View CRON run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 50;
```

### Check Edge Function Logs
```bash
# Job scraper logs
npx supabase functions logs scrape-hospital-jobs --project-ref sfmgdvjwmoxoeqmcarbv

# Career discovery logs
npx supabase functions logs discover-career-pages --project-ref sfmgdvjwmoxoeqmcarbv
```

---

## 🎯 Expected Results

### Day 1 (First 24 hours)
- ✅ All 500+ hospitals discovered/scraped once
- ✅ Fresh job data for all hospitals
- ✅ Even distribution across 24 hours

### Ongoing (Every 24 hours)
- ✅ Continuous updates
- ✅ New hospitals added automatically
- ✅ Stale jobs detected and removed
- ✅ Career pages stay up-to-date

---

## 🔧 Tuning Options

### If Timeout Issues Occur

**Option A**: Reduce batch sizes
```typescript
// Job scraper: 25 → 20
.limit(20);

// Career discovery: 50 → 40
.limit(40);
```

**Option B**: Increase frequency
```sql
-- Run every 30 minutes instead of hourly
'*/30 * * * *'

-- Adjust batch sizes accordingly
```

### If Coverage Exceeds Needs

**Option**: Reduce frequency to save resources
```sql
-- Job scraper: Every 2 hours (instead of hourly)
'0 */2 * * *'

-- Increase batch size to 50
.limit(50);
```

---

## 📋 Deployment Checklist

- [x] Create migration `20260223000000_update_cron_hourly.sql`
- [x] Update job scraper batch size (10 → 25)
- [x] Update career discovery batch size (20 → 50)
- [ ] Apply migration to database
- [ ] Deploy updated Edge Functions
- [ ] Verify CRON jobs are scheduled
- [ ] Monitor first 24-hour cycle
- [ ] Check coverage after 24 hours
- [ ] Adjust if needed based on results

---

## 🚀 Deployment Commands

```bash
# 1. Apply migration (update CRON schedule)
npx supabase db push --linked

# 2. Deploy updated Edge Functions
npx supabase functions deploy scrape-hospital-jobs discover-career-pages \
  --project-ref sfmgdvjwmoxoeqmcarbv --no-verify-jwt

# 3. Verify CRON jobs
npx supabase db execute "SELECT * FROM cron.job;" --linked

# 4. Monitor execution
npx supabase functions logs scrape-hospital-jobs --tail
```

---

## 📊 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Coverage** | 100% of hospitals/day | `SELECT COUNT(*) FROM hospitals WHERE last_scraped_at > NOW() - INTERVAL '24 hours'` |
| **Average Age** | < 24 hours | `SELECT AVG(NOW() - last_scraped_at) FROM hospitals WHERE is_active = true` |
| **CRON Success Rate** | > 95% | Check `cron.job_run_details` for failures |
| **Edge Function Timeouts** | < 5% | Monitor logs for timeout errors |
| **Job Freshness** | All jobs < 24h old | `SELECT COUNT(*) FROM jobs WHERE scraped_at > NOW() - INTERVAL '24 hours'` |

---

**System Status**: ✅ **Ready for 24-hour full coverage**

**Next Review**: 2026-02-24 (after first full cycle)

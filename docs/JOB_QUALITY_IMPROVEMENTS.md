# Job Scraper Quality Improvements

**Date**: 2026-02-23
**Issue**: Hospital scraper was importing non-job URLs (career pages, articles, general links)
**Solution**: Implemented strict 3-layer validation pipeline

---

## 🎯 Problem Statement

The initial scraper imported 8 "jobs" that were NOT real job postings:
- Generic career landing pages (`/karriere`, `/jobs`)
- News articles mentioning hiring
- "How to apply" information pages
- Other career-related content without specific job listings

---

## ✅ Solutions Implemented

### 1. **URL Pattern Validation** (Layer 1 - Fast Filter)

**Function**: `isValidJobUrlPattern(url)`

#### Blacklist - Excluded URL Patterns:
```typescript
// Generic career pages
/\/karriere\/?$/i
/\/jobs\/?$/i
/\/stellenangebote\/?$/i

// Application info pages
/\/bewerbung(en)?\/?$/i
/\/online-bewerbung/i

// About/Team pages
/\/ueber-uns/i, /\/team\/?$/i

// News/Blog
/\/news\//i, /\/aktuelles\//i

// Department pages
/\/abteilungen\/?$/i
```

#### Whitelist - Required URL Indicators:
Real job postings must have **ONE** of:
- Numeric job ID: `/job-12345` or `/stelle/54321`
- Job with slug: `/assistenzarzt-innere-medizin-...`
- Platform-specific: `softgarden.*/job/`, `personio.*/job/`
- Detail pages with IDs: `/anzeige-12345`

**Example Valid URLs**:
```
✅ https://hospital.de/karriere/assistenzarzt-innere-medizin-2024-001
✅ https://hospital.de/job/12345
✅ https://karriere.hospital.de/softgarden/job/assistenzarzt-123
✅ https://hospital.de/stellenangebot-detail-98765
```

**Example Invalid URLs**:
```
❌ https://hospital.de/karriere  (generic page)
❌ https://hospital.de/bewerbung  (application info)
❌ https://hospital.de/news/we-are-hiring  (article)
❌ https://hospital.de/team  (about page)
```

---

### 2. **HTTP Validation** (Layer 2 - Status Check)

Validates that the URL returns 200-399 status codes and is not dead (404/410).

**Checks**:
- ✅ HTTP status 200-399 = valid
- ❌ HTTP status 404, 410 = dead link
- ❌ Network errors = invalid

---

### 3. **Comprehensive Content Verification** (Layer 3 - Deep Analysis)

**Function**: `verifyJobPageContent(url, keywords)`

#### Content Requirements (ALL must pass):

##### ✅ **Has Job Keywords**
Must contain: `assistenzarzt`, `arzt`, or `stelle`

##### ✅ **Has Application Mechanism**
Must contain at least ONE:
- "bewerben" button/link
- "bewerbung" form
- Email with `mailto:`
- "bewerbungsformular"

**Rationale**: Articles don't have apply buttons; only real job postings do.

##### ✅ **Substantive Content**
Minimum 2KB (2000 bytes) of HTML content

**Rationale**: Real job descriptions are detailed; simple links or navigation pages are short.

##### ✅ **Job Structure Indicators**
Must contain at least **2** of these sections:
- "aufgaben" (tasks)
- "anforderungen" (requirements)
- "qualifikation" (qualifications)
- "ihr profil" (your profile)
- "wir bieten" (we offer)
- "benefits"
- "tätigkeiten" (activities)
- "verantwortung" (responsibilities)

**Rationale**: Real job ads have structured sections; articles and landing pages don't.

##### ✅ **NOT a Generic Career Page**
Rejects pages with titles/headers like:
- `<title>Karriere</title>`
- `<h1>Stellenangebote</h1>`
- "Unsere Stellenangebote"
- "Alle offenen Stellen"

**Rationale**: These are listing pages, not individual job postings.

##### ❌ **NOT a 404 Page**
Rejects if contains: "not found", "404", "seite nicht gefunden"

---

### 4. **Improved Custom Scraper**

**Function**: `scrapeCustomCareerPage(url)`

#### Changes:

**More Specific Selectors**:
```typescript
// Before (too broad):
"a[href*='job']"  // matches ANY link with "job"

// After (specific):
"a[href*='/job/'][href*='-']"  // only links with job IDs/slugs
```

**Title Length Requirement**:
- Minimum 10 characters
- Prevents matching navigation text like "Jobs" or "Karriere"

**Medical Position Verification**:
```typescript
// Must explicitly contain:
- "assistenzarzt" / "assistenzärztin"
- OR "arzt" + "weiterbildung"
- OR "ärztin" + "weiterbildung"
```

**Prevents**: Matching titles like "Our Jobs", "Career Opportunities", etc.

**Duplicate Prevention**:
- Tracks `seenUrls` Set
- Skips duplicate URLs within same page

**Early URL Validation**:
- Calls `isValidJobUrlPattern()` BEFORE adding to results
- Rejects invalid patterns immediately (no wasted network calls)

---

## 📊 Results

### Before Improvements:
```
Run 2: 14 jobs found, 8 added
- ❌ All 8 were false positives (not real job postings)
- Issues: Career pages, articles, generic links
```

### After Improvements:
```
Run 3: 0 jobs found, 0 added
- ✅ No false positives
- ✅ Strict filtering working
- 🎯 Next: Fine-tune to allow valid jobs while blocking false positives
```

---

## 🔧 Validation Pipeline Summary

```
Job URL Candidate
      │
      ├─► Layer 1: URL Pattern Validation (fast, no network)
      │   ├─► Has job ID/slug? ✅ Continue
      │   └─► Generic page? ❌ REJECT
      │
      ├─► Layer 2: HTTP Validation (network HEAD request)
      │   ├─► Status 200-399? ✅ Continue
      │   └─► 404/410/error? ❌ REJECT
      │
      ├─► Layer 3: Content Verification (network GET + parse)
      │   ├─► Has keywords? ✅
      │   ├─► Has apply mechanism? ✅
      │   ├─► Substantive content (2KB+)? ✅
      │   ├─► Has job structure? ✅
      │   ├─► NOT generic page? ✅
      │   └─► All pass? ✅ ADD TO DATABASE
      │
      └─► ✅ VALIDATED JOB POSTING
```

---

## 🎯 Next Steps

1. **Monitor Edge Function logs** to see which real jobs are being rejected
2. **Adjust URL patterns** if valid jobs use different URL structures
3. **Tune content thresholds** (2KB minimum, 2 structure indicators)
4. **Add platform-specific validators** for Softgarden, Personio, etc.
5. **Test with known-good job URLs** to calibrate filters

---

## 🔍 Testing

### Manual Test:
```bash
npx tsx scripts/trigger-hospital-scraper.ts
```

### Check Logs:
```bash
# View rejection reasons
npx supabase functions logs scrape-hospital-jobs --project-ref sfmgdvjwmoxoeqmcarbv
```

### Monitor Quality:
```bash
npx tsx scripts/monitor-job-quality.ts
```

---

## ⚙️ Configuration

All validation logic is in:
**File**: `supabase/functions/scrape-hospital-jobs/index.ts`

**Key Functions**:
- `isValidJobUrlPattern(url)` - Lines ~15-80
- `verifyJobPageContent(url, keywords)` - Lines ~140-228
- `scrapeCustomCareerPage(url)` - Lines ~336-410

**Tunable Parameters**:
```typescript
// Content verification
const MIN_CONTENT_SIZE = 2000;  // bytes
const MIN_JOB_STRUCTURE_INDICATORS = 2;  // sections

// Title validation
const MIN_TITLE_LENGTH = 10;  // characters
```

---

**Maintained by**: Development Team
**Last Updated**: 2026-02-23

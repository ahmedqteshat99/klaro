# XING Integration Setup Guide

This guide explains how to add XING job scraping with Cloudflare bypass to your job import system.

## 📋 What Was Added

### 1. **Puppeteer Service** (`scripts/puppeteer-service.js`)
- Node.js/Express service that runs headless Chrome
- Uses `puppeteer-extra-plugin-stealth` to bypass Cloudflare
- Exposes HTTP API for browser-based scraping
- Reuses browser instance for performance

### 2. **Browser Scraper Helper** (`supabase/functions/_shared/browser-scraper.ts`)
- Deno/TypeScript wrapper to call Puppeteer service
- Handles timeouts and error handling
- Checks service availability before scraping

### 3. **XING Parser** (in `import-rss-jobs/index.ts`)
- `parseXingPage()` - Extracts jobs from XING HTML
- Supports JSON-LD structured data parsing
- Falls back to HTML parsing if needed
- Filters for Assistenzarzt positions only

### 4. **Integration** (in `import-rss-jobs/index.ts`)
- Added XING to `ALL_SOURCES` array
- Uses `scrapeBrowserJobBoard()` for XING
- Parallel scraping with other sources
- Includes XING in source name mapping

## 🚀 Quick Start

### Step 1: Install Puppeteer Service

```bash
cd scripts
npm install
```

This installs:
- `puppeteer` + `puppeteer-extra` + `puppeteer-extra-plugin-stealth`
- `express` for HTTP server

### Step 2: Start the Service

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Service runs on **http://localhost:3001**

### Step 3: Configure Environment

Add to your local `.env` or Supabase environment variables:

```bash
PUPPETEER_SERVICE_URL=http://localhost:3001/scrape
```

### Step 4: Test

```bash
# Test health check
curl http://localhost:3001/health

# Test XING scraping
./scripts/test-xing-scraper.sh
```

### Step 5: Run Import

```bash
# Local testing
supabase functions serve import-rss-jobs --no-verify-jwt

# Trigger import
curl -X POST http://localhost:54321/functions/v1/import-rss-jobs \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Supabase Edge Function (Deno)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ import-rss-jobs                                 │   │
│  │                                                 │   │
│  │  Regular HTTP scraping:                        │   │
│  │  • Stellenmarkt      ──┐                       │   │
│  │  • Ärzteblatt          │                       │   │
│  │  • PraktischArzt       ├─► fetch()             │   │
│  │  • MediJobs            │                       │   │
│  │                        │                       │   │
│  │  Browser scraping:     │                       │   │
│  │  • XING ────────────────┼─► scrapeWithBrowser()│   │
│  └────────────────────────┼────────────────────────┘   │
└────────────────────────────┼───────────────────────────┘
                             │
                             │ HTTP POST
                             │ /scrape
                             ▼
            ┌─────────────────────────────────┐
            │  Puppeteer Service (Node.js)    │
            │  localhost:3001                 │
            │                                 │
            │  • Headless Chrome              │
            │  • Stealth Plugin               │
            │  • Cloudflare Bypass            │
            │  • User-Agent Rotation          │
            │                                 │
            │  Returns: HTML + Cookies        │
            └─────────────────────────────────┘
```

## 🔧 How It Works

### 1. **Edge Function Requests HTML**

```typescript
const scraped = await scrapeWithBrowser(
  "https://www.xing.com/jobs/search?keywords=assistenzarzt",
  {
    timeout: 30000,
    waitForSelector: ".job-card",
  }
);
```

### 2. **Puppeteer Service Renders Page**

```javascript
const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();

// Stealth mode - avoids detection
await page.setUserAgent('Mozilla/5.0...');
await page.goto(url, { waitUntil: 'networkidle2' });

// Wait for content to load
await page.waitForSelector('.job-card');

// Return rendered HTML
const html = await page.content();
```

### 3. **Edge Function Parses Jobs**

```typescript
function parseXingPage(html: string): ScrapedJob[] {
  // Extract from JSON-LD
  const jsonLd = /<script type="application\/ld\+json">(.*)<\/script>/g;

  // Filter for Assistenzarzt
  if (title.includes("assistenzarzt")) {
    jobs.push({ title, link, company, location });
  }
}
```

## 🌐 Production Deployment

### Option 1: Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
cd scripts
railway up

# Get URL
railway domain

# Update Supabase env
PUPPETEER_SERVICE_URL=https://your-app.railway.app/scrape
```

### Option 2: Docker

```dockerfile
FROM node:20-slim

# Install Chrome
RUN apt-get update && apt-get install -y chromium

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY scripts/package*.json ./
RUN npm ci --production

COPY scripts/puppeteer-service.js ./
EXPOSE 3001
CMD ["node", "puppeteer-service.js"]
```

```bash
docker build -t puppeteer-service .
docker run -p 3001:3001 puppeteer-service
```

### Option 3: Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly launch

# Deploy
fly deploy

# Get URL
fly info

# Update Supabase env
PUPPETEER_SERVICE_URL=https://your-app.fly.dev/scrape
```

## 📊 Expected Results

When working correctly, you should see:

```
[run_12345] Scraping Assistenzarzt listings from multiple sources...
[run_12345] Page 1: found 12 jobs (Stellenmarkt)
[run_12345] Page 1: found 8 jobs (Ärzteblatt)
[run_12345] Page 1: found 15 jobs (PraktischArzt)
[run_12345] Page 1: found 3 jobs (MediJobs)
[run_12345] Browser scraping page 1: https://www.xing.com/...
[run_12345] Page 1: found 24 jobs (XING)  👈 NEW!

[run_12345] Scraped totals:
  Stellenmarkt=12
  Ärzteblatt=8
  PraktischArzt=15
  MediJobs=3
  XING=24  👈 NEW!
```

## 🐛 Troubleshooting

### Issue: "Browser scraper service not available"

**Cause:** Puppeteer service not running

**Fix:**
```bash
cd scripts
npm start
```

Check health: `curl http://localhost:3001/health`

---

### Issue: "Cloudflare challenge detected"

**Symptoms:** HTML contains "Just a moment..." or "Checking your browser"

**Fixes:**
1. ✅ Already using stealth plugin (enabled)
2. Add longer delays between requests:
   ```typescript
   await new Promise(r => setTimeout(r, 5000)); // 5s delay
   ```
3. Use residential proxies (advanced, requires paid service)

---

### Issue: "No jobs found from XING"

**Debug steps:**
1. Check if selector is correct:
   ```bash
   curl -X POST http://localhost:3001/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.xing.com/jobs/search?keywords=assistenzarzt", "screenshot": true}' \
     | jq -r '.screenshot' | base64 -d > debug.png
   ```
   Open `debug.png` to see what the browser sees

2. Inspect HTML structure:
   ```bash
   curl -X POST http://localhost:3001/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "https://www.xing.com/jobs/search?keywords=assistenzarzt"}' \
     | jq -r '.html' | grep -i "assistenzarzt"
   ```

3. Update `waitForSelector` in `scrapeBrowserJobBoard()`:
   ```typescript
   waitForSelector: "article, .job-card, [data-testid='job-listing']"
   ```

---

### Issue: "Navigation timeout"

**Cause:** Page loading too slowly

**Fix:** Increase timeout:
```typescript
await scrapeWithBrowser(url, { timeout: 60000 }); // 60s
```

---

### Issue: "Out of memory"

**Cause:** Too many browser instances

**Fix:** Restart service (browser instance is reused)
```bash
# Find process
ps aux | grep puppeteer-service

# Kill
kill -9 PID

# Restart
npm start
```

## 🔐 Security Best Practices

### Rate Limiting
Already configured:
- 3 second delay between pages
- Max 5 pages per source
- Single browser instance (shared across requests)

### Authentication
For production, add API key to Puppeteer service:

```javascript
// puppeteer-service.js
app.use((req, res, next) => {
  if (req.path === '/health') return next();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.PUPPETEER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

Update `browser-scraper.ts`:
```typescript
const response = await fetch(puppeteerEndpoint, {
  headers: {
    "Content-Type": "application/json",
    "x-api-key": Deno.env.get("PUPPETEER_API_KEY"),
  },
  // ...
});
```

### HTTPS Only
Use HTTPS in production:
```bash
PUPPETEER_SERVICE_URL=https://your-service.railway.app/scrape
```

## 📈 Performance Metrics

Expected performance:
- **Cold start**: ~5s (browser launch)
- **Warm request**: ~10-15s per page
- **Memory**: ~200-300 MB per browser instance
- **CPU**: Moderate (Chrome rendering)

Optimization tips:
- ✅ Browser instance reuse (already implemented)
- ✅ Parallel scraping with other sources (already implemented)
- Consider page pooling for high volume

## ✅ Testing Checklist

- [ ] Puppeteer service starts without errors
- [ ] Health check returns `{"status":"ok"}`
- [ ] Test XING scrape returns HTML
- [ ] HTML contains "assistenzarzt"
- [ ] No Cloudflare challenge in HTML
- [ ] Edge function includes XING in results
- [ ] Jobs appear in database with `rss_feed_source='xing'`
- [ ] Production service is accessible via HTTPS

## 🎯 Next Steps

1. **Add More Sites**: Use the same approach for Indeed, StepStone
2. **Monitor Performance**: Track scraping success rates
3. **Handle Failures**: Add retry logic for transient errors
4. **Scale**: Deploy multiple Puppeteer instances with load balancing

## 📚 Additional Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
- [Cloudflare Bypass Techniques](https://github.com/ultrafunkamsterdam/undetected-chromedriver)
- [Railway Deployment Guide](https://docs.railway.app/)

## 💬 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Enable screenshot mode to debug visually
3. Check Puppeteer service logs for errors
4. Test the URL in a regular browser first

---

**Status**: ✅ XING integration complete and ready to test!

# Puppeteer Service for XING & JavaScript-Heavy Job Sites

This service enables scraping of JavaScript-heavy job sites (like XING) that use Cloudflare protection or require browser rendering.

## Why is this needed?

XING, StepStone, Indeed, and similar sites use:
- **Cloudflare protection** - Blocks automated HTTP requests
- **JavaScript rendering** - Content loads dynamically via JS
- **Bot detection** - Identifies and blocks scraper user agents

Traditional `fetch()` requests get blocked. This service uses **Puppeteer with stealth plugins** to bypass these protections.

## Architecture

```
┌─────────────────────────────────────┐
│  Supabase Edge Function             │
│  (import-rss-jobs)                  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ HTTP Scrapers (fetch)       │   │
│  │ • Stellenmarkt              │   │
│  │ • Ärzteblatt                │   │
│  │ • PraktischArzt             │   │
│  │ • MediJobs                  │   │
│  └─────────────────────────────┘   │
│           │                         │
│           │ HTTP POST               │
│           ▼                         │
│  ┌─────────────────────────────┐   │
│  │ Browser Scraper (remote)    │   │
│  │ • XING ──────────────────┐  │   │
│  └──────────────────────────│──┘   │
└──────────────────────────────│──────┘
                               │
                  HTTP POST    │
                  /scrape      │
                               ▼
        ┌─────────────────────────────────┐
        │  Puppeteer Service              │
        │  (Node.js + Express)            │
        │                                 │
        │  • Headless Chrome              │
        │  • Stealth plugin               │
        │  • Cloudflare bypass            │
        │  • Returns rendered HTML        │
        └─────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
cd scripts
npm install
```

This installs:
- `puppeteer` - Headless Chrome
- `puppeteer-extra` - Plugin framework
- `puppeteer-extra-plugin-stealth` - Cloudflare bypass
- `express` - HTTP server

### 2. Start the Service

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The service runs on **http://localhost:3001** by default.

### 3. Configure Environment Variables

Add to your `.env` or Supabase environment:

```bash
PUPPETEER_SERVICE_URL=http://localhost:3001/scrape
```

For **production deployment** (Docker, Railway, Fly.io):
```bash
PUPPETEER_SERVICE_URL=https://your-puppeteer-service.fly.dev/scrape
```

### 4. Test the Service

**Health check:**
```bash
curl http://localhost:3001/health
```

**Test scraping:**
```bash
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.xing.com/jobs/search?keywords=assistenzarzt",
    "timeout": 30000,
    "waitForSelector": ".job-card"
  }'
```

## Usage from Supabase Function

The `import-rss-jobs` function automatically uses the Puppeteer service for XING:

```typescript
import { scrapeWithBrowser } from "../_shared/browser-scraper.ts";

// Scrape XING jobs
const scraped = await scrapeWithBrowser(
  "https://www.xing.com/jobs/search?keywords=assistenzarzt",
  {
    timeout: 30000,
    waitForSelector: ".job-card",
  }
);

const jobs = parseXingPage(scraped.html);
```

## API Reference

### POST /scrape

Scrape a URL using headless Chrome.

**Request:**
```json
{
  "url": "https://example.com",
  "timeout": 30000,
  "waitForSelector": ".content",
  "screenshot": false
}
```

**Response:**
```json
{
  "html": "<html>...</html>",
  "url": "https://example.com",
  "cookies": [...],
  "screenshot": "base64..." // if requested
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "puppeteer-scraper"
}
```

## Production Deployment

### Option 1: Docker

```dockerfile
FROM node:20-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set Chrome path
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY scripts/package.json scripts/package-lock.json ./
RUN npm ci --production

COPY scripts/puppeteer-service.js ./
EXPOSE 3001
CMD ["node", "puppeteer-service.js"]
```

**Build & Run:**
```bash
docker build -t puppeteer-service .
docker run -p 3001:3001 puppeteer-service
```

### Option 2: Railway.app

1. Create `railway.toml`:
```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "cd scripts && npm start"
```

2. Deploy:
```bash
railway up
```

3. Get the service URL and update `PUPPETEER_SERVICE_URL` in Supabase.

### Option 3: Fly.io

1. Create `fly.toml`:
```toml
app = "assistenzarzt-puppeteer"

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

2. Deploy:
```bash
fly deploy
```

## Troubleshooting

### Browser fails to launch

**Error:** `Failed to launch the browser process`

**Solution:**
```bash
# Linux
sudo apt-get install -y chromium chromium-browser

# macOS
brew install chromium
```

### Cloudflare still blocking

**Symptoms:** Returns Cloudflare challenge page

**Solutions:**
1. Add delays between requests (already configured: 3s)
2. Rotate user agents (enabled)
3. Use residential proxies (advanced - requires paid service)

### Out of memory

**Error:** `JavaScript heap out of memory`

**Solution:** Increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Timeouts

**Error:** `Navigation timeout of 30000 ms exceeded`

**Solutions:**
1. Increase timeout: `"timeout": 60000`
2. Wait for specific selector instead of `networkidle2`
3. Check if site requires authentication

## Performance Optimization

### Browser Instance Reuse
The service reuses a single browser instance for all requests (faster than launching per request).

### Page Pooling (Advanced)
For high-volume scraping, implement a page pool:
```javascript
const pages = await Promise.all([
  browser.newPage(),
  browser.newPage(),
  browser.newPage(),
]);
```

### Headless Mode
- `headless: 'new'` - Faster, no UI
- `headless: false` - For debugging (shows browser window)

## Security Notes

⚠️ **Rate Limiting**: Implement rate limiting to avoid getting banned:
- Max 1 request per 3 seconds (configured)
- Max 5 pages per source (configured in Edge Function)

⚠️ **HTTPS Only**: Only deploy over HTTPS in production.

⚠️ **Authentication**: Add API key authentication for production:
```javascript
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.PUPPETEER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

## Adding More Sites

To scrape other JavaScript-heavy sites (Indeed, StepStone, etc.):

1. Add the site config to `import-rss-jobs/index.ts`:
```typescript
const INDEED_URL = "https://de.indeed.com/jobs?q=assistenzarzt";
const INDEED_SOURCE = "indeed";
```

2. Create a parser function:
```typescript
function parseIndeedPage(html: string): ScrapedJob[] {
  // Parse Indeed's HTML structure
}
```

3. Add to scraping flow:
```typescript
scrapeBrowserJobBoard(
  INDEED_URL,
  parseIndeedPage,
  (base, page) => `${base}&start=${(page - 1) * 10}`,
  runId
)
```

4. Update `ALL_SOURCES` array.

## Monitoring

Monitor the service health:
```bash
# Check if service is running
curl http://localhost:3001/health

# View logs
docker logs -f container-id  # Docker
heroku logs --tail           # Heroku
fly logs                     # Fly.io
```

## Support

For issues:
1. Check logs for error messages
2. Test with `curl` to isolate the issue
3. Enable screenshot mode to see what the browser sees
4. Try scraping the URL in a regular browser

## License

MIT

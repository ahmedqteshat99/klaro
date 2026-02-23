/**
 * Puppeteer Service for Browser-Based Scraping
 *
 * This service handles JavaScript-heavy sites that use Cloudflare protection.
 * It runs separately from Supabase Edge Functions.
 *
 * Usage:
 *   node scripts/puppeteer-service.js
 *
 * Then configure PUPPETEER_SERVICE_URL in your .env:
 *   PUPPETEER_SERVICE_URL=http://localhost:3001/scrape
 */

const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Browser instance (reused for better performance)
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-features=VizDisplayCompositor', // macOS compatibility
        '--disable-extensions',
        '--disable-web-security', // Allow cross-origin requests
        '--disable-crash-reporter', // Silence crash reporter warnings
      ],
      // Ignore default args that cause issues on macOS
      ignoreDefaultArgs: ['--disable-extensions'],
    });
  }
  return browser;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'puppeteer-scraper' });
});

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url, timeout = 30000, waitForSelector, screenshot = false } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  console.log(`[Puppeteer] Scraping: ${url}`);

  let page = null;

  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Set extra headers to look more human
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Navigate to page with timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // Wait for specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Get HTML content
    const html = await page.content();

    // Get final URL (after redirects)
    const finalUrl = page.url();

    // Get cookies (useful for maintaining sessions)
    const cookies = await page.cookies();

    // Optional screenshot for debugging
    let screenshotData = null;
    if (screenshot) {
      screenshotData = await page.screenshot({ encoding: 'base64' });
    }

    console.log(`[Puppeteer] Successfully scraped ${url} (${html.length} bytes)`);

    res.json({
      html,
      url: finalUrl,
      cookies,
      screenshot: screenshotData,
    });
  } catch (error) {
    console.error(`[Puppeteer] Error scraping ${url}:`, error.message);
    res.status(500).json({
      error: error.message,
      url,
    });
  } finally {
    if (page) {
      await page.close();
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing browser...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing browser...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`🚀 Puppeteer service running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Scrape endpoint: POST http://localhost:${PORT}/scrape`);
});
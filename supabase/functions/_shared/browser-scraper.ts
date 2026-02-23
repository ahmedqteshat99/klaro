/**
 * Browser-based scraper for JavaScript-heavy sites (XING, Indeed, StepStone, etc.)
 * Uses Puppeteer to bypass Cloudflare and render JavaScript
 *
 * NOTE: This is designed to run in a separate service (Node.js/Deno with Puppeteer)
 * NOT in Supabase Edge Functions due to resource constraints.
 */

export interface BrowserScraperConfig {
  puppeteerEndpoint?: string; // URL to Puppeteer service (e.g., http://localhost:3001/scrape)
  timeout?: number;
  waitForSelector?: string;
  userAgent?: string;
}

export interface ScrapedPage {
  html: string;
  url: string;
  cookies?: any[];
  screenshot?: string; // base64
}

/**
 * Scrape a page using a remote Puppeteer service
 * This delegates the browser work to a separate service that handles Cloudflare bypass
 */
export async function scrapeWithBrowser(
  url: string,
  config: BrowserScraperConfig = {}
): Promise<ScrapedPage> {
  const {
    puppeteerEndpoint = Deno.env.get("PUPPETEER_SERVICE_URL") || "http://localhost:3001/scrape",
    timeout = 30000,
    waitForSelector,
  } = config;

  try {
    const response = await fetch(puppeteerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        timeout,
        waitForSelector,
      }),
      signal: AbortSignal.timeout(timeout + 5000),
    });

    if (!response.ok) {
      throw new Error(`Puppeteer service returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Browser scraping failed for ${url}:`, error);
    throw error;
  }
}

/**
 * Check if browser scraping service is available
 */
export async function isBrowserScraperAvailable(endpoint?: string): Promise<boolean> {
  // Get the base URL and convert /scrape endpoint to /health
  const serviceUrl = endpoint || Deno.env.get("PUPPETEER_SERVICE_URL") || "http://localhost:3001/scrape";
  // Replace /scrape with /health, or just add /health to base URL
  const healthUrl = serviceUrl.endsWith('/scrape')
    ? serviceUrl.slice(0, -7) + '/health'
    : serviceUrl.replace(/\/$/, '') + '/health';

  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enrichLocationWithState } from "../_shared/enrich-location.ts";
import { scrapeWithBrowser, isBrowserScraperAvailable } from "../_shared/browser-scraper.ts";

// ─── Configuration ───────────────────────────────────────────────
// Stellenmarkt config
const STELLENMARKT_URL = "https://www.stellenmarkt.de/stellenangebote--Assistenzarzt";
const STELLENMARKT_SOURCE = "stellenmarkt_medizin";

// Ärzteblatt config
const AERZTEBLATT_URL = "https://aerztestellen.aerzteblatt.de/de/stellen/assistenzarzt-arzt-weiterbildung";
const AERZTEBLATT_SOURCE = "aerzteblatt";

// PraktischArzt config
const PRAKTISCHARZT_URL = "https://www.praktischarzt.de/assistenzarzt/";
const PRAKTISCHARZT_SOURCE = "praktischarzt";

// MediJobs config (pagination is JS-based; only page 1 is fetchable via HTTP)
const MEDIJOBS_URL = "https://www.medi-jobs.de/jobs/?s=assistenzarzt";
const MEDIJOBS_SOURCE = "medijobs";

// XING config (requires Puppeteer service due to Cloudflare protection)
const XING_URL = "https://www.xing.com/jobs/search?keywords=assistenzarzt&location=Deutschland";
const XING_SOURCE = "xing";

// NOTE: StepStone, Indeed, Jobvector, and jobs.aerztezeitung.de removed —
// they use JavaScript rendering, Cloudflare protection, or the domain does not exist.

// Shared config
const MAX_PAGES = 5; // Legacy default (unused now, each source has its own MAX_PAGES)
const MAX_PAGES_STELLENMARKT = 100; // Stellenmarkt scraping depth
const MAX_PAGES_AERZTEBLATT = 100; // Ärzteblatt has many pages; scrape deeper
const MAX_PAGES_PRAKTISCHARZT = 100; // PraktischArzt has many pages; scrape deeper
const MAX_PAGES_MEDIJOBS = 100; // MediJobs scraping depth
const MAX_PAGES_XING = 100; // XING scraping depth (browser-based)
const MAX_BROWSER_PAGES = 1; // Browser-based scraping is slow; limit to 1 page (DEPRECATED)
const MAX_JOBS_PER_RUN = 300; // Safe for single source imports (with timeout safety)
const EXPIRATION_GRACE_HOURS = 48;

// ─── Helpers ─────────────────────────────────────────────────────

function generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sha256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function cleanText(raw: string): string {
    return raw
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// enrichLocationWithState is imported from ../_shared/enrich-location.ts

interface ScrapedJob {
    title: string;
    link: string;
    company: string;
    location: string;
    guid: string; // The anzeige URL as unique identifier
    employerUrl?: string; // Direct employer application URL (resolved from detail page)
}

/** Scrape job listings from a single Stellenmarkt search results page. */
function parseStellemarktPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];

    // Match job listing blocks: <a ... href="/anzeige[ID].html" ... title="Stellenangebot [TITLE]">
    // followed by <h2 class="h4">TITLE</h2>
    const jobBlockRegex = /<a[^>]*href="(\/anzeige\d+\.html)"[^>]*title="Stellenangebot ([^"]*)"[^>]*>\s*<h2[^>]*>([^<]*)<\/h2>/g;

    let match;
    while ((match = jobBlockRegex.exec(html)) !== null) {
        const path = match[1];
        const titleFromAttr = cleanText(match[2]);
        const titleFromH2 = cleanText(match[3]);
        const link = `https://www.stellenmarkt.de${path}`;

        // Use the more complete title
        const title = titleFromAttr.length > titleFromH2.length ? titleFromAttr : titleFromH2;

        // Skip if already seen (duplicates within page)
        if (jobs.some((j) => j.guid === link)) continue;

        jobs.push({
            title,
            link,
            company: "",
            location: "",
            guid: link,
        });
    }

    // Now try to extract company and location for each job
    // Company: appears in <span> or text near the job listing
    // Location: <i class="fas fa-map-marker-alt"></i> LOCATION
    for (const job of jobs) {
        const anzeigePath = job.link.replace("https://www.stellenmarkt.de", "");
        // Find the block around this listing
        const blockStart = html.indexOf(anzeigePath);
        if (blockStart === -1) continue;

        // Get ~2000 chars of context around the listing
        const blockEnd = Math.min(blockStart + 2000, html.length);
        const block = html.substring(blockStart, blockEnd);

        // Extract location: <i class="fas fa-map-marker-alt"></i> LOCATION
        const locationMatch = block.match(/fa-map-marker-alt"><\/i>\s*([^<\n]+)/);
        if (locationMatch) {
            job.location = cleanText(locationMatch[1]);
        }

        // Extract company from title="Stellenangebote von COMPANY"
        const companyMatch = block.match(/title="Stellenangebote von ([^"]+)"/);
        if (companyMatch) {
            job.company = cleanText(companyMatch[1]);
        }
    }

    return jobs;
}

/** Scrape job listings from a single Ärzteblatt search results page. */
function parseAerzteblattPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];

    // Hrefs are absolute URLs: https://aerztestellen.aerzteblatt.de/de/stelle/[slug]
    // Title is reliably in the title="" attribute on the same <a> tag
    // Note: Allow any attributes (like class="recruiter-job-link") between href and title
    const jobLinkRegex = /<a\s+href="(https:\/\/aerztestellen\.aerzteblatt\.de\/de\/stelle\/[^"]+)"[^>]*title="([^"]+)"/g;
    const matches = [...html.matchAll(jobLinkRegex)];

    for (const match of matches) {
        const fullLink = match[1];
        const title = cleanText(match[2]);
        if (!title) continue;

        // Dedup within page
        if (jobs.some((j) => j.guid === fullLink)) continue;

        // Extract ~2000-char context around this link for company/location
        const matchIndex = match.index ?? 0;
        const contextStart = Math.max(0, matchIndex - 500);
        const contextEnd = Math.min(html.length, matchIndex + 1500);
        const context = html.substring(contextStart, contextEnd);

        // Extract company (text after date pattern: "23.02.2026, Company Name")
        const companyMatch = context.match(/\d{2}\.\d{2}\.\d{4},\s*([^\n<]+)/);
        const company = companyMatch?.[1]?.trim() || "";

        // Extract location (zip code + city, e.g. "74613 Öhringen")
        const locationMatch = context.match(/(\d{5}\s+[A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\s\-]+)/);
        const location = locationMatch?.[1]?.trim() || "";

        jobs.push({
            title,
            link: fullLink,
            company: cleanText(company),
            location: cleanText(location),
            guid: fullLink,
        });
    }

    return jobs;
}

/** Scrape job listings from a single PraktischArzt search results page. */
function parsePraktischArztPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];

    // Each job block starts with: <div id="job-XXXXX" class="row job box-job ...">
    const jobBlockRegex = /<div\s+id="job-\d+"[^>]*class="[^"]*box-job[^"]*"[^>]*>/g;
    const blockStarts: number[] = [];
    let blockMatch;
    while ((blockMatch = jobBlockRegex.exec(html)) !== null) {
        blockStarts.push(blockMatch.index);
    }

    for (let i = 0; i < blockStarts.length; i++) {
        const start = blockStarts[i];
        const end = i + 1 < blockStarts.length ? blockStarts[i + 1] : Math.min(start + 5000, html.length);
        const block = html.substring(start, end);

        // Job URL: href="https://www.praktischarzt.de/job/SLUG/"
        const linkMatch = block.match(/href="(https:\/\/www\.praktischarzt\.de\/job\/[^"]+)"/);
        if (!linkMatch) continue;
        const link = linkMatch[1];

        if (jobs.some((j) => j.guid === link)) continue;

        // Title: <a class="title-link title desktop_show" ... title="Mehr Details für TITLE anzeigen"> TITLE </a>
        const titleMatch = block.match(/class="title-link\s+title\s+desktop_show"[^>]*>\s*([^<]+?)\s*<\/a>/);
        const title = titleMatch ? cleanText(titleMatch[1]) : "";
        if (!title) continue;

        // Company: <div class="employer-name"> <a ...><i ...></i> COMPANY</a></div>
        const companyMatch = block.match(/class="employer-name"[^>]*>.*?<\/i>\s*([^<]+)<\/a>/);
        const company = companyMatch ? cleanText(companyMatch[1]) : "";

        // Location: after svg-location span, plain text until next tag
        const locationMatch = block.match(/class="svg-location"[^>]*>.*?<\/svg><\/span>([^<]+)/);
        const location = locationMatch ? cleanText(locationMatch[1]) : "";

        jobs.push({ title, link, company, location, guid: link });
    }

    return jobs;
}

/** Scrape job listings from a single medi-jobs.de search results page.
 *  Job links follow the pattern /{employer-id}/{job-id}/ (two numeric segments).
 *  Pagination on medi-jobs.de is JS-based so only page 1 is fetchable via HTTP. */
function parseMediJobsPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    // Links: <a href="/675/1/"><strong>Title</strong></a>
    const linkRegex = /<a[^>]+href="(\/\d+\/\d+\/)"[^>]*>\s*<strong>([^<]+)<\/strong>/g;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const urlPath = match[1];
        const title = cleanText(match[2]);
        if (!title) continue;

        const fullLink = `https://www.medi-jobs.de${urlPath}`;
        if (seen.has(fullLink)) continue;
        seen.add(fullLink);

        // Context after the link for company and location
        const idx = match.index;
        const ctx = html.substring(idx, Math.min(html.length, idx + 600));

        // Structure after </a>: Company\nDate\nLocation (plain text nodes)
        // Strip the matched <a>...</a> block then read the following text
        const afterLink = ctx.replace(/<a[^>]+>[\s\S]*?<\/a>/, "");
        const textNodes = afterLink
            .replace(/<[^>]*>/g, "\n")
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 1 && !/^\d{2}\.\d{2}\.\d{4}$/.test(s)); // skip date-only lines

        const company = textNodes[0] ? cleanText(textNodes[0]) : "";
        const location = textNodes[1] ? cleanText(textNodes[1]) : "";

        jobs.push({ title, link: fullLink, company, location, guid: fullLink });
    }

    return jobs;
}

/** Scrape job listings from XING (requires browser rendering due to Cloudflare).
 *  Links follow pattern: https://www.xing.com/jobs/[city]-[job-slug]-[id]
 */
function parseXingPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    // XING uses structured data - extract from JSON-LD
    const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let match;

    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const data = JSON.parse(match[1]);

            // Check if it's a JobPosting
            if (data["@type"] === "JobPosting" || data["@graph"]?.[0]?.["@type"] === "JobPosting") {
                const jobData = data["@type"] === "JobPosting" ? data : data["@graph"]?.[0];

                const title = jobData.title || "";
                const url = jobData.url || "";

                if (!title || !url || seen.has(url)) continue;

                // Filter for Assistenzarzt positions
                const lowerTitle = title.toLowerCase();
                if (
                    lowerTitle.includes("assistenzarzt") ||
                    lowerTitle.includes("assistenzärztin") ||
                    lowerTitle.includes("arzt in weiterbildung")
                ) {
                    seen.add(url);

                    const company = jobData.hiringOrganization?.name || "";
                    const location = jobData.jobLocation?.address?.addressLocality ||
                        jobData.jobLocation?.address?.addressRegion || "";

                    // Extract employer's direct URL (not the XING ad link)
                    const orgUrl = jobData.hiringOrganization?.url
                        || jobData.hiringOrganization?.sameAs
                        || "";
                    // Only use it if it's a real external URL (not xing.com)
                    const employerUrl = orgUrl && !orgUrl.includes("xing.com") ? orgUrl : undefined;

                    jobs.push({
                        title: cleanText(title),
                        link: url,
                        company: cleanText(company),
                        location: cleanText(location),
                        guid: url,
                        employerUrl,
                    });
                }
            }
        } catch (e) {
            // Skip invalid JSON
        }
    }

    // Fallback: Parse HTML structure if JSON-LD not available
    if (jobs.length === 0) {
        // XING job links pattern: <a href="/jobs/..." aria-label="Job Title">
        // Title is in aria-label attribute, not link text
        const linkRegex = /<a[^>]+href="((?:https:\/\/www\.xing\.com)?\/jobs\/[^"]+)"[^>]*aria-label="([^"]+)"[^>]*>/g;

        while ((match = linkRegex.exec(html)) !== null) {
            let urlPath = match[1];
            const ariaLabel = match[2];

            // Convert relative URL to absolute
            const url = urlPath.startsWith('http')
                ? urlPath
                : `https://www.xing.com${urlPath}`;

            if (seen.has(url)) continue;

            // Title is in aria-label attribute
            const title = cleanText(ariaLabel);

            if (!title || title.length < 10) continue;

            // Filter for Assistenzarzt
            const lowerTitle = title.toLowerCase();
            if (
                lowerTitle.includes("assistenzarzt") ||
                lowerTitle.includes("assistenzärztin") ||
                lowerTitle.includes("arzt in weiterbildung")
            ) {
                seen.add(url);
                jobs.push({
                    title,
                    link: url,
                    company: "",
                    location: "",
                    guid: url,
                });
            }
        }
    }

    return jobs;
}

/** Check if there's a next page. */
function hasNextPage(html: string, currentPage: number): boolean {
    return html.includes(`page=${currentPage + 1}`);
}

/** Generic scraper function for job boards with pagination. */
async function scrapeJobBoard(
    baseUrl: string,
    parsePageFn: (html: string) => ScrapedJob[],
    getNextPageUrl: (baseUrl: string, page: number) => string,
    runId: string,
    maxPages: number = MAX_PAGES
): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];

    for (let page = 1; page <= maxPages; page++) {
        const url = getNextPageUrl(baseUrl, page);

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
                },
                signal: AbortSignal.timeout(30_000),
            });

            if (!response.ok) {
                console.warn(`[${runId}] Page ${page} returned ${response.status}, stopping`);
                break;
            }

            const html = await response.text();
            const jobs = parsePageFn(html);

            console.log(`[${runId}] Page ${page}: found ${jobs.length} jobs`);
            allJobs.push(...jobs);

            // No more jobs on this page, stop pagination
            if (jobs.length === 0) break;

            // Delay between pages (polite scraping)
            if (page < MAX_PAGES) {
                await new Promise((r) => setTimeout(r, 1500));
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Fetch error";
            console.error(`[${runId}] Page ${page} error: ${msg}`);
            break;
        }
    }

    return allJobs;
}

/** Browser-based scraper for JavaScript-heavy sites (XING, etc.) */
async function scrapeBrowserJobBoard(
    baseUrl: string,
    parsePageFn: (html: string) => ScrapedJob[],
    getNextPageUrl: (baseUrl: string, page: number) => string,
    runId: string,
    maxPages: number = MAX_BROWSER_PAGES
): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];

    // Check if browser scraper service is available
    const browserAvailable = await isBrowserScraperAvailable();
    if (!browserAvailable) {
        console.warn(`[${runId}] Browser scraper service not available, skipping browser-based scraping`);
        return [];
    }

    for (let page = 1; page <= maxPages; page++) {
        const url = getNextPageUrl(baseUrl, page);

        try {
            console.log(`[${runId}] Browser scraping page ${page}: ${url}`);

            // Use browser scraper to bypass Cloudflare
            // Timeout reduced to 45s to stay within edge function limits
            const scraped = await scrapeWithBrowser(url, {
                timeout: 45000,
                waitForSelector: "article, .job-card, .job-listing, [data-testid='job-card'], [class*='job-teaser'], a[href*='/jobs/']",
            });

            const jobs = parsePageFn(scraped.html);

            console.log(`[${runId}] Page ${page}: found ${jobs.length} jobs`);
            allJobs.push(...jobs);

            // No more jobs on this page, stop pagination
            if (jobs.length === 0) break;

            // Delay between pages (polite scraping + avoid detection)
            if (page < maxPages) {
                await new Promise((r) => setTimeout(r, 3000)); // Longer delay for browser scraping
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Browser scrape error";
            console.error(`[${runId}] Page ${page} error: ${msg}`);
            break;
        }
    }

    return allJobs;
}

/** Fetch a job detail page and extract the employer's direct application URL. */
async function resolveEmployerUrl(jobPageUrl: string): Promise<string | null> {
    try {
        const response = await fetch(jobPageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
            },
            signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) return null;
        const html = await response.text();

        // Stellenmarkt / generic: "Jetzt bewerben" links with external href (text directly in <a>)
        const bewerbenLinks = [
            ...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>\s*Jetzt bewerben\s*<\/a>/gi),
            ...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*>[^<]*[Bb]ewerben[^<]*<\/a>/gi),
        ];

        for (const match of bewerbenLinks) {
            const href = match[1];
            if (href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("/")) continue;
            if (
                href.includes("stellenmarkt.de") || href.includes("aerzteblatt.de") ||
                href.includes("praktischarzt.de") || href.includes("medi-jobs.de") ||
                href.includes("jobvector.de") || href.includes("aerztezeitung.de")
            ) continue;
            if (href.startsWith("http")) return href;
        }

        // PraktischArzt: <a class="apply_job_button" ... href="URL"><div class="btnshare">Jetzt bewerben</div></a>
        const applyButtonLinks = [
            ...html.matchAll(/<a[^>]*class="apply_job_button[^"]*"[^>]*href="([^"]+)"[^>]*>/gi),
            ...html.matchAll(/<a[^>]*href="([^"]+)"[^>]*class="apply_job_button[^"]*"[^>]*>/gi),
        ];

        for (const match of applyButtonLinks) {
            const href = match[1];
            if (href.startsWith("mailto:") || href.startsWith("#") || href.startsWith("/")) continue;
            if (
                href.includes("stellenmarkt.de") || href.includes("aerzteblatt.de") ||
                href.includes("praktischarzt.de") || href.includes("medi-jobs.de") ||
                href.includes("jobvector.de") || href.includes("aerztezeitung.de")
            ) continue;
            if (href.startsWith("http")) return href;
        }

        // Ärzteblatt: "Bewerben" links to /de/node/.../apply-external (redirect)
        const applyExternalMatch = html.match(/href="(\/de\/node\/\d+\/apply-external)"/);
        if (applyExternalMatch) {
            const redirectUrl = new URL(applyExternalMatch[1], jobPageUrl).href;
            try {
                const redirectResp = await fetch(redirectUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
                        "Accept": "text/html",
                    },
                    redirect: "manual",
                    signal: AbortSignal.timeout(10_000),
                });
                const location = redirectResp.headers.get("Location");
                if (location && location.startsWith("http") && !location.includes("aerzteblatt.de")) {
                    return location;
                }
            } catch {
                // Redirect follow failed, fall through
            }
        }

        return null;
    } catch {
        return null;
    }
}

interface AiJobEnrichment {
    description: string;
    department: string | null;
    tags: string[];
}

/** Generate an AI summary + extract department and tags for a job using Claude. */
async function generateAiSummary(
    job: ScrapedJob,
    apiKey: string
): Promise<AiJobEnrichment> {
    const fallback: AiJobEnrichment = {
        description: `${job.title}${job.company ? ` bei ${job.company}` : ""}${job.location ? ` in ${job.location}` : ""}.`,
        department: null,
        tags: [],
    };

    try {
        const contextParts = [
            `TITEL: ${job.title}`,
            job.company ? `ARBEITGEBER: ${job.company}` : null,
            job.location ? `STANDORT: ${job.location}` : null,
        ].filter(Boolean).join("\n");

        const prompt = `Analysiere diese Stellenanzeige für einen Assistenzarzt und extrahiere strukturierte Daten.

${contextParts}

Antworte NUR mit validem JSON in diesem exakten Format (keine Erklärungen, kein Markdown):
{
  "description": "2-3 professionelle, einladende Sätze auf Deutsch. Beschreibe: Was für eine Klinik ist es, was sind die Hauptaufgaben, was macht die Stelle attraktiv.",
  "department": "Medizinischer Fachbereich aus dem Titel, z.B. Innere Medizin, Chirurgie, Pädiatrie, Gynäkologie, Anästhesie, Notaufnahme, Psychiatrie, Radiologie, Neurologie, Orthopädie. Wenn nicht eindeutig erkennbar, gib null zurück.",
  "tags": ["Vollzeit ODER Teilzeit (falls erkennbar)", "Weiterbildung (falls im Titel)", "weitere relevante Stichworte wie Notaufnahme, Intensivstation, max 4 Tags gesamt"]
}

WICHTIG: Das Feld 'department' soll der medizinische Fachbereich sein (z.B. 'Innere Medizin'), NICHT der vollständige Stellentitel.`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 400,
                system: "Du extrahierst strukturierte Daten aus deutschen Stellenanzeigen für Ärzte. Antworte NUR mit validem JSON, keine Erklärungen, kein Markdown.",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) {
            console.error(`AI API error: ${response.status}`);
            return fallback;
        }

        const data = await response.json();
        let rawText = data.content?.[0]?.text?.trim() ?? "";

        // Strip markdown fences if present
        rawText = rawText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

        let parsed: { description?: string; department?: string | null; tags?: string[] };
        try {
            parsed = JSON.parse(rawText);
        } catch {
            console.error("AI JSON parse error:", rawText);
            return fallback;
        }

        const description = typeof parsed.description === "string" && parsed.description.length > 10
            ? parsed.description.trim()
            : fallback.description;

        const department = typeof parsed.department === "string" && parsed.department.length > 1
            ? parsed.department.trim()
            : null;

        const tags = Array.isArray(parsed.tags)
            ? parsed.tags
                .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
                .map((t) => t.trim())
                .slice(0, 5)
            : [];

        return { description, department, tags };
    } catch (err) {
        console.error("AI summary error:", err);
        return fallback;
    }
}

// ─── All sources ─────────────────────────────────────────────────
const ALL_SOURCES = [
    STELLENMARKT_SOURCE,
    AERZTEBLATT_SOURCE,
    PRAKTISCHARZT_SOURCE,
    MEDIJOBS_SOURCE,
    XING_SOURCE,
] as const;

// ─── Main Handler ────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    const runId = generateRunId();

    // Timeout safety: Track execution time to exit gracefully before Edge Function timeout
    const FUNCTION_START_TIME = Date.now();
    const MAX_EXECUTION_TIME = 140000; // 140 seconds (10s buffer before 150s timeout)
    const shouldContinueProcessing = () => (Date.now() - FUNCTION_START_TIME) < MAX_EXECUTION_TIME;

    const results = {
        runId,
        totalListings: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        expired: 0,
        errors: 0,
        pagesScraped: 0,
        errorMessages: [] as string[],
    };

    try {
        // Parse request body to get optional sources filter
        let requestedSources: string[] | null = null;
        try {
            const body = await req.json();
            if (body.sources && Array.isArray(body.sources)) {
                requestedSources = body.sources;
            }
        } catch {
            // No body or invalid JSON - that's fine, use all sources
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

        // ── Auth: admin only or CRON_SECRET ──
        const authHeader = req.headers.get("Authorization");
        const cronSecret = Deno.env.get("CRON_SECRET");
        const headerSecret = req.headers.get("x-cron-secret");

        const isCron = cronSecret && headerSecret === cronSecret;

        if (!isCron) {
            if (!authHeader) {
                return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
                    status: 401,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }

            // Use anon key client with the user's Authorization header for verification
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: authHeader } },
            });

            // Verify JWT and get user
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !user) {
                console.error('Auth error:', userError);
                return new Response(JSON.stringify({ error: "Authentifizierung fehlgeschlagen" }), {
                    status: 401,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }

            // Use service role client to check admin role (bypasses RLS)
            const dbAdmin = createClient(supabaseUrl, serviceRoleKey);
            const { data: roleData, error: roleError } = await dbAdmin
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (roleError || roleData?.role !== "ADMIN") {
                console.error('Role check failed:', roleError, roleData);
                return new Response(JSON.stringify({ error: "Nur Admins" }), {
                    status: 403,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
        }
        const db = createClient(supabaseUrl, serviceRoleKey);

        // ── Rate limit: check last successful run ──
        const { data: lastRun } = await db
            .from("job_import_logs")
            .select("created_at")
            .eq("action", "run_completed")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        // TEMPORARILY DISABLED FOR TESTING - Re-enable for production!
        // if (lastRun) {
        //     const lastRunAge = Date.now() - new Date(lastRun.created_at).getTime();
        //     if (lastRunAge < 10 * 60 * 1000) { // 10 minute cooldown
        //         return new Response(
        //             JSON.stringify({
        //                 success: false,
        //                 error: "Zu früh. Letzter Import vor weniger als 10 Minuten.",
        //                 lastRun: lastRun.created_at,
        //             }),
        //             { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        //         );
        //     }
        // }

        // Determine which sources to scrape
        const sourcesToScrape = requestedSources && requestedSources.length > 0
            ? requestedSources
            : [...ALL_SOURCES];

        console.log(`[${runId}] Requested sources:`, sourcesToScrape);

        // Log run start
        await db.from("job_import_logs").insert({
            run_id: runId,
            action: "run_started",
            details: { sources: sourcesToScrape, method: "html_scrape" },
        });

        // ── 1. Scrape search results pages from requested sources in parallel ──
        console.log(`[${runId}] Scraping Assistenzarzt listings from: ${sourcesToScrape.join(", ")}`);

        const [
            stellenmarktJobs,
            aerzteblattJobs,
            praktischArztJobs,
            mediJobsJobs,
            xingJobs,
        ] = await Promise.all([
            // Stellenmarkt
            sourcesToScrape.includes(STELLENMARKT_SOURCE)
                ? scrapeJobBoard(
                    STELLENMARKT_URL,
                    parseStellemarktPage,
                    (base, page) => page === 1 ? base : `${base}?page=${page}`,
                    runId,
                    MAX_PAGES_STELLENMARKT
                )
                : Promise.resolve([]),

            // Ärzteblatt (deeper scrape — many pages available)
            sourcesToScrape.includes(AERZTEBLATT_SOURCE)
                ? scrapeJobBoard(
                    AERZTEBLATT_URL,
                    parseAerzteblattPage,
                    (base, page) => page === 1 ? base : `${base}?page=${page}`,
                    runId,
                    MAX_PAGES_AERZTEBLATT
                )
                : Promise.resolve([]),

            // PraktischArzt (deeper scrape — many pages available)
            sourcesToScrape.includes(PRAKTISCHARZT_SOURCE)
                ? scrapeJobBoard(
                    PRAKTISCHARZT_URL,
                    parsePraktischArztPage,
                    (base, page) => page === 1 ? base : `${base}${page}/`,
                    runId,
                    MAX_PAGES_PRAKTISCHARZT
                )
                : Promise.resolve([]),

            // MediJobs (pagination is JS-based; page 2+ will 404 and stop naturally)
            sourcesToScrape.includes(MEDIJOBS_SOURCE)
                ? scrapeJobBoard(
                    MEDIJOBS_URL,
                    parseMediJobsPage,
                    (base, page) => page === 1 ? base : `${base}&page=${page}`,
                    runId,
                    MAX_PAGES_MEDIJOBS
                )
                : Promise.resolve([]),

            // XING (uses browser scraper to bypass Cloudflare)
            sourcesToScrape.includes(XING_SOURCE)
                ? scrapeBrowserJobBoard(
                    XING_URL,
                    parseXingPage,
                    (base, page) => page === 1 ? base : `${base}&page=${page}`,
                    runId,
                    MAX_PAGES_XING
                )
                : Promise.resolve([]),
        ]);

        console.log(
            `[${runId}] Scraped totals: ` +
            `Stellenmarkt=${stellenmarktJobs.length}, ` +
            `Ärzteblatt=${aerzteblattJobs.length}, ` +
            `PraktischArzt=${praktischArztJobs.length}, ` +
            `MediJobs=${mediJobsJobs.length}, ` +
            `XING=${xingJobs.length}`
        );

        // Tag jobs with their source
        interface ScrapedJobWithSource extends ScrapedJob {
            feedSource: string;
        }

        const allScrapedJobs: ScrapedJobWithSource[] = [
            ...stellenmarktJobs.map((j) => ({ ...j, feedSource: STELLENMARKT_SOURCE })),
            ...aerzteblattJobs.map((j) => ({ ...j, feedSource: AERZTEBLATT_SOURCE })),
            ...praktischArztJobs.map((j) => ({ ...j, feedSource: PRAKTISCHARZT_SOURCE })),
            ...mediJobsJobs.map((j) => ({ ...j, feedSource: MEDIJOBS_SOURCE })),
            ...xingJobs.map((j) => ({ ...j, feedSource: XING_SOURCE })),
        ];

        results.totalListings = allScrapedJobs.length;
        console.log(`[${runId}] Total: ${allScrapedJobs.length} listings from all sources`);

        if (allScrapedJobs.length === 0) {
            await db.from("job_import_logs").insert({
                run_id: runId,
                action: "error",
                details: { phase: "scrape", error: "No listings found from any source" },
            });
            throw new Error("Keine Stellenangebote von beiden Quellen gefunden");
        }

        // ── 2. Load existing jobs for dedup ──
        const { data: existingJobs } = await db
            .from("jobs")
            .select("id, rss_guid, rss_content_hash, import_status, rss_feed_source, apply_url, location")
            .in("rss_feed_source", sourcesToScrape)
            .not("rss_guid", "is", null);

        const existingByGuid = new Map(
            (existingJobs ?? []).map((j: any) => [j.rss_guid, j])
        );

        const seenGuids = new Set<string>();
        const itemsToProcess = allScrapedJobs.slice(0, MAX_JOBS_PER_RUN * sourcesToScrape.length);
        let urlBackfillCount = 0;
        const MAX_URL_BACKFILLS_PER_RUN = 5; // Limit backfills to keep run time short

        // Aggregator domains — used to detect jobs needing employer URL backfill
        const aggregatorDomains = [
            "stellenmarkt.de", "aerzteblatt.de", "praktischarzt.de", "medi-jobs.de", "xing.com",
        ];

        // ── 3. Process each listing ──
        for (const job of itemsToProcess) {
            // Check if approaching timeout - exit gracefully to avoid Edge Function timeout
            if (!shouldContinueProcessing()) {
                console.log(`[${runId}] ⏱️ Approaching timeout, stopping processing early`);
                console.log(`[${runId}] ✅ Processed ${results.imported + results.updated} jobs before timeout`);
                break;
            }

            seenGuids.add(job.guid);

            try {
                const contentHash = await sha256(job.title + job.company + job.location);
                const existing = existingByGuid.get(job.guid);
                const feedSource = job.feedSource;

                // Determine source display name
                const sourceNameMap: Record<string, string> = {
                    [STELLENMARKT_SOURCE]: "stellenmarkt.de",
                    [AERZTEBLATT_SOURCE]: "aerzteblatt.de",
                    [PRAKTISCHARZT_SOURCE]: "praktischarzt.de",
                    [MEDIJOBS_SOURCE]: "medi-jobs.de",
                    [XING_SOURCE]: "xing.com",
                };
                const sourceName = sourceNameMap[feedSource] ?? feedSource;

                if (existing) {
                    // Update last_seen
                    await db
                        .from("jobs")
                        .update({ rss_last_seen_at: new Date().toISOString() })
                        .eq("id", existing.id);

                    if (existing.rss_content_hash === contentHash) {
                        // Backfill employer URL for existing jobs that still point to the aggregator
                        const currentUrl = (existing as any).apply_url as string | null;
                        const needsUrlBackfill = currentUrl &&
                            aggregatorDomains.some((d) => currentUrl.includes(d));

                        if (needsUrlBackfill && urlBackfillCount < MAX_URL_BACKFILLS_PER_RUN) {
                            const backfilledUrl = job.employerUrl || await resolveEmployerUrl(job.link);
                            if (backfilledUrl) {
                                await db
                                    .from("jobs")
                                    .update({ apply_url: backfilledUrl, source_url: backfilledUrl })
                                    .eq("id", (existing as any).id);
                                console.log(`[${runId}] Backfilled employer URL for "${job.title}": ${backfilledUrl}`);
                            }
                            urlBackfillCount++;
                            await new Promise((r) => setTimeout(r, 1000));
                        }

                        // Backfill location with Bundesland if the DB value doesn't already have one
                        const dbLocation = (existing as any).location as string | null;
                        if (dbLocation) {
                            const enrichedLoc = enrichLocationWithState(dbLocation);
                            if (enrichedLoc !== dbLocation) {
                                await db
                                    .from("jobs")
                                    .update({ location: enrichedLoc })
                                    .eq("id", (existing as any).id);
                                console.log(`[${runId}] Backfilled state for "${job.title}": ${enrichedLoc}`);
                            }
                        }

                        results.skipped++;
                        await db.from("job_import_logs").insert({
                            run_id: runId,
                            action: "skipped",
                            rss_guid: job.guid,
                            job_id: existing.id,
                            job_title: job.title,
                            details: { reason: "content_unchanged", source: feedSource },
                        });
                        continue;
                    }

                    // Content changed — re-resolve employer URL (prefer pre-extracted employer URL)
                    const updatedEmployerUrl = job.employerUrl || await resolveEmployerUrl(job.link);
                    if (updatedEmployerUrl) console.log(`[${runId}] Resolved employer URL: ${updatedEmployerUrl}`);
                    if (!job.employerUrl) await new Promise((r) => setTimeout(r, 1000));

                    const enrichment = await generateAiSummary(job, anthropicKey);
                    const updateApplyUrl = updatedEmployerUrl || job.link;
                    const enrichedLocation = enrichLocationWithState(job.location);
                    await db
                        .from("jobs")
                        .update({
                            description: enrichment.description,
                            department: enrichment.department,
                            tags: enrichment.tags.length > 0 ? enrichment.tags : null,
                            hospital_name: job.company || null,
                            location: enrichedLocation || null,
                            apply_url: updateApplyUrl,
                            source_url: updateApplyUrl,
                            rss_content_hash: contentHash,
                            rss_last_seen_at: new Date().toISOString(),
                        })
                        .eq("id", existing.id);

                    results.updated++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "updated",
                        rss_guid: job.guid,
                        job_id: existing.id,
                        job_title: job.title,
                        details: { reason: "content_changed", source: feedSource },
                    });
                    console.log(`[${runId}] Updated (${sourceName}): ${job.title}`);
                } else {
                    // New job — prefer pre-extracted employer URL, fall back to resolving from detail page
                    const employerUrl = job.employerUrl || await resolveEmployerUrl(job.link);
                    if (employerUrl) console.log(`[${runId}] Resolved employer URL: ${employerUrl}`);
                    if (!job.employerUrl) await new Promise((r) => setTimeout(r, 1000));

                    const applyUrl = employerUrl || job.link;

                    // Check if a published job with this URL already exists (prevent duplicate imports)
                    if (applyUrl) {
                        const { data: existingPublished } = await db
                            .from("jobs")
                            .select("id, title")
                            .eq("apply_url", applyUrl)
                            .eq("is_published", true)
                            .limit(1);

                        if (existingPublished && existingPublished.length > 0) {
                            console.log(`[${runId}] Skipping duplicate (already published): ${job.title}`);
                            results.skipped++;
                            continue;
                        }
                    }

                    const enrichment = await generateAiSummary(job, anthropicKey);
                    const enrichedLocation = enrichLocationWithState(job.location);

                    const { data: inserted, error: insertErr } = await db
                        .from("jobs")
                        .insert({
                            title: job.title,
                            description: enrichment.description,
                            department: enrichment.department,
                            tags: enrichment.tags.length > 0 ? enrichment.tags : null,
                            hospital_name: job.company || null,
                            location: enrichedLocation || null,
                            apply_url: applyUrl,
                            source_url: applyUrl,
                            source_name: sourceName,
                            rss_guid: job.guid,
                            rss_content_hash: contentHash,
                            rss_imported_at: new Date().toISOString(),
                            rss_last_seen_at: new Date().toISOString(),
                            rss_feed_source: feedSource,
                            import_status: "pending_review",
                            is_published: false,
                            scraped_at: new Date().toISOString(),
                        })
                        .select("id")
                        .single();

                    if (insertErr) {
                        if (insertErr.message?.includes("unique") || insertErr.message?.includes("duplicate")) {
                            results.skipped++;
                            continue;
                        }
                        throw insertErr;
                    }

                    results.imported++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "imported",
                        rss_guid: job.guid,
                        job_id: inserted?.id,
                        job_title: job.title,
                        details: { source: feedSource },
                    });
                    console.log(`[${runId}] Imported (${sourceName}): ${job.title}`);

                    // Delay between AI calls
                    await new Promise((r) => setTimeout(r, 500));
                }
            } catch (itemErr) {
                results.errors++;
                const msg = itemErr instanceof Error ? itemErr.message : "Unknown error";
                results.errorMessages.push(`${job.title}: ${msg}`);
                await db.from("job_import_logs").insert({
                    run_id: runId,
                    action: "error",
                    rss_guid: job.guid,
                    job_title: job.title,
                    details: { error: msg, source: job.feedSource },
                });
                console.error(`[${runId}] Error: "${job.title}":`, msg);
            }
        }

        // ── 4. Mark expired jobs (check per source) ──
        const expirationThreshold = new Date(
            Date.now() - EXPIRATION_GRACE_HOURS * 60 * 60 * 1000
        ).toISOString();

        for (const source of sourcesToScrape) {
            const seenGuidsForSource = new Set(
                allScrapedJobs
                    .filter((j) => j.feedSource === source)
                    .map((j) => j.guid)
            );

            for (const [guid, existing] of existingByGuid) {
                if (
                    (existing as any).rss_feed_source === source &&
                    !seenGuidsForSource.has(guid) &&
                    (existing as any).import_status === "pending_review"
                ) {
                    const { data: jobData } = await db
                        .from("jobs")
                        .select("rss_last_seen_at")
                        .eq("id", (existing as any).id)
                        .single();

                    if (jobData?.rss_last_seen_at && jobData.rss_last_seen_at < expirationThreshold) {
                        await db
                            .from("jobs")
                            .update({ import_status: "expired" })
                            .eq("id", (existing as any).id);

                        results.expired++;
                        await db.from("job_import_logs").insert({
                            run_id: runId,
                            action: "expired",
                            rss_guid: guid,
                            job_id: (existing as any).id,
                            details: { last_seen: jobData.rss_last_seen_at, source: source },
                        });
                    }
                }
            }
        }

        // ── Log completion ──
        await db.from("job_import_logs").insert({
            run_id: runId,
            action: "run_completed",
            details: results,
        });

        console.log(`[${runId}] Complete:`, JSON.stringify(results));

        return new Response(JSON.stringify({ success: true, ...results }), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(`[${runId}] Fatal error:`, err);
        const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
        return new Response(
            JSON.stringify({ success: false, error: errorMessage, ...results }),
            {
                status: 500,
                headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            }
        );
    }
});

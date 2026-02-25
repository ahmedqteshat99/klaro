import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enrichLocationWithState } from "../_shared/enrich-location.ts";

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

// Ethimedis config (uses legacy AJAX endpoint — no browser needed)
// type_id=5 filters for Assistenzarzt positions only
const ETHIMEDIS_URL = "https://www.ethimedis.de/joboffers/index/type_id/5/sortby/data__joboffers.publication_date/sortdirection/desc";
const ETHIMEDIS_SOURCE = "ethimedis";

// NOTE: StepStone, Indeed, Jobvector, and jobs.aerztezeitung.de removed —
// they use JavaScript rendering, Cloudflare protection, or the domain does not exist.

// Shared config
const MAX_PAGES = 5; // Legacy default (unused now, each source has its own MAX_PAGES)
const MAX_PAGES_STELLENMARKT = 100; // Stellenmarkt scraping depth
const MAX_PAGES_AERZTEBLATT = 100; // Ärzteblatt has many pages; scrape deeper
const MAX_PAGES_PRAKTISCHARZT = 100; // PraktischArzt has many pages; scrape deeper
const MAX_PAGES_ETHIMEDIS = 50; // Ethimedis scraping depth
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

/**
 * Check if a job title is for a junior-level position (Assistenzarzt / Arzt in Weiterbildung).
 * Accepts combined titles like "Assistenzarzt / Oberarzt" since they're relevant to junior doctors.
 *
 * @param title - The job title to check (will be converted to lowercase)
 * @returns true if the title should be included, false otherwise
 */
function isJuniorPosition(title: string): boolean {
    const lowerTitle = title.toLowerCase();

    // Include if title explicitly mentions junior-level positions
    return (
        lowerTitle.includes("assistenzarzt") ||
        lowerTitle.includes("assistenzärztin") ||
        lowerTitle.includes("arzt in weiterbildung") ||
        lowerTitle.includes("ärztin in weiterbildung")
    );
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

        // Only include junior-level positions (includes combined titles like "Assistenzarzt / Oberarzt")
        if (!isJuniorPosition(title)) {
            console.log(`  [Stellenmarkt] Skipping non-junior position: ${title}`);
            continue;
        }

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

        // Only include junior-level positions
        if (!isJuniorPosition(title)) {
            console.log(`  [Ärzteblatt] Skipping non-junior position: ${title}`);
            continue;
        }

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

/** Parse job listings from the Ethimedis legacy AJAX HTML content.
 *  Expects the HTML from the `content` field of the JSON response.
 *  URL uses type_id=5 for server-side Assistenzarzt filtering. */
function parseEthimedisPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    // Each job block has data-jobofferid="ID"
    const jobBlockRegex = /data-jobofferid="(\d+)"/g;
    const jobIds: { id: string; index: number }[] = [];
    let match;

    while ((match = jobBlockRegex.exec(html)) !== null) {
        const id = match[1];
        if (!jobIds.some((j) => j.id === id)) {
            jobIds.push({ id, index: match.index });
        }
    }

    for (let i = 0; i < jobIds.length; i++) {
        const { id, index: start } = jobIds[i];
        const end = i + 1 < jobIds.length ? jobIds[i + 1].index : html.length;
        const block = html.substring(start, end);

        // Title: <h5>...</h5>
        const titleMatch = block.match(/<h5[^>]*>\s*([\s\S]*?)\s*<\/h5>/);
        const title = titleMatch ? cleanText(titleMatch[1]) : "";
        if (!title || title.length < 5) continue;

        // Skip Initiativbewerbung
        if (title.toLowerCase().includes("initiativbewerbung")) {
            console.log(`  [Ethimedis] Skipping Initiativbewerbung: ${title}`);
            continue;
        }

        // Only include junior-level positions (extra safeguard on top of type_id=5)
        if (!isJuniorPosition(title)) {
            console.log(`  [Ethimedis] Skipping non-junior position: ${title}`);
            continue;
        }

        const fullLink = `https://www.ethimedis.de/joboffers/nicedetails/id/${id}`;
        if (seen.has(fullLink)) continue;
        seen.add(fullLink);

        // Company: text between PremiumUser</div><br> and <h5, contains <br> for department
        const companyMatch = block.match(/PremiumUser<\/div><br>\s*\n\s*\n\s*([\s\S]*?)\s*<h5/);
        const companyRaw = companyMatch ? companyMatch[1].replace(/<br\s*\/?>/g, " - ").replace(/<[^>]*>/g, "").trim() : "";
        const company = cleanText(companyRaw);

        // Location: after map-marker SVG, in <span class="look_text">
        const locationMatch = block.match(/awesome-map-marker[\s\S]*?<span class="look_text">\s*(.*?)\s*<\/span>/);
        const location = locationMatch ? cleanText(locationMatch[1]) : "";

        jobs.push({
            title,
            link: fullLink,
            company: company || "",
            location: location || "",
            guid: fullLink,
        });
    }

    return jobs;
}

/** Scrape Ethimedis via legacy AJAX endpoint (offset-based pagination, JSON response). */
async function scrapeEthimedis(runId: string, maxPages: number): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    for (let offset = 0; offset < maxPages * 15; offset += 15) {
        const url = `${ETHIMEDIS_URL}/offset/${offset}?format=json`;

        try {
            const response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
                    "Accept": "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                signal: AbortSignal.timeout(30_000),
            });

            if (!response.ok) {
                console.warn(`[${runId}] Ethimedis offset ${offset} returned ${response.status}, stopping`);
                break;
            }

            const json = await response.json();
            const html = json.content || "";
            const jobs = parseEthimedisPage(html);

            console.log(`[${runId}] Ethimedis offset ${offset}: found ${jobs.length} jobs`);

            for (const job of jobs) {
                if (!seen.has(job.guid)) {
                    seen.add(job.guid);
                    allJobs.push(job);
                }
            }

            if (jobs.length === 0) break;

            // Polite delay between pages
            if (offset + 15 < maxPages * 15) {
                await new Promise((r) => setTimeout(r, 1500));
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Fetch error";
            console.error(`[${runId}] Ethimedis offset ${offset} error: ${msg}`);
            break;
        }
    }

    return allJobs;
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
                href.includes("jobvector.de") || href.includes("aerztezeitung.de") ||
                href.includes("ethimedis.de")
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
                href.includes("jobvector.de") || href.includes("aerztezeitung.de") ||
                href.includes("ethimedis.de")
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
    ETHIMEDIS_SOURCE,
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
            ethimedisJobs,
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

            // Ethimedis (legacy AJAX endpoint — no browser needed)
            sourcesToScrape.includes(ETHIMEDIS_SOURCE)
                ? scrapeEthimedis(runId, MAX_PAGES_ETHIMEDIS)
                : Promise.resolve([]),
        ]);

        console.log(
            `[${runId}] Scraped totals: ` +
            `Stellenmarkt=${stellenmarktJobs.length}, ` +
            `Ärzteblatt=${aerzteblattJobs.length}, ` +
            `PraktischArzt=${praktischArztJobs.length}, ` +
            `Ethimedis=${ethimedisJobs.length}`
        );

        // Tag jobs with their source
        interface ScrapedJobWithSource extends ScrapedJob {
            feedSource: string;
        }

        const allScrapedJobs: ScrapedJobWithSource[] = [
            ...stellenmarktJobs.map((j) => ({ ...j, feedSource: STELLENMARKT_SOURCE })),
            ...aerzteblattJobs.map((j) => ({ ...j, feedSource: AERZTEBLATT_SOURCE })),
            ...praktischArztJobs.map((j) => ({ ...j, feedSource: PRAKTISCHARZT_SOURCE })),
            ...ethimedisJobs.map((j) => ({ ...j, feedSource: ETHIMEDIS_SOURCE })),
        ];

        results.totalListings = allScrapedJobs.length;
        console.log(`[${runId}] Total: ${allScrapedJobs.length} listings from all sources`);

        if (allScrapedJobs.length === 0) {
            await db.from("job_import_logs").insert({
                run_id: runId,
                action: "run_completed",
                details: { phase: "scrape", note: "No listings found from requested sources", sources: sourcesToScrape },
            });
            return new Response(
                JSON.stringify({
                    success: true,
                    results: { ...results, totalListings: 0 },
                    message: `Keine Stellenangebote von ${sourcesToScrape.join(", ")} gefunden. Möglicherweise ist der Browser-Scraper nicht erreichbar.`,
                }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
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
            "stellenmarkt.de", "aerzteblatt.de", "praktischarzt.de",
            "ethimedis.de",
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
                    [ETHIMEDIS_SOURCE]: "ethimedis.de",
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

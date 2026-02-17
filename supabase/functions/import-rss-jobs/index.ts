import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ───────────────────────────────────────────────
// Stellenmarkt config
const STELLENMARKT_URL = "https://www.stellenmarkt.de/stellenangebote--Assistenzarzt";
const STELLENMARKT_SOURCE = "stellenmarkt_medizin";

// Ärzteblatt config
const AERZTEBLATT_URL = "https://aerztestellen.aerzteblatt.de/de/stellen/assistenzarzt-arzt-weiterbildung";
const AERZTEBLATT_SOURCE = "aerzteblatt";

// Shared config
const MAX_PAGES = 5; // Scrape up to 5 pages per source
const MAX_JOBS_PER_RUN = 50; // Per source (100 total across 2 sources)
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

interface ScrapedJob {
    title: string;
    link: string;
    company: string;
    location: string;
    guid: string; // The anzeige URL as unique identifier
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

    // Match all job links: <a href="/de/stelle/assistenzarzt-...-[numeric-id]">
    const jobLinkRegex = /<a\s+href="(\/de\/stelle\/[^"]+)"/g;
    const matches = [...html.matchAll(jobLinkRegex)];

    for (const match of matches) {
        const urlPath = match[1]; // /de/stelle/assistenzarzt-...-82767
        const fullLink = `https://aerztestellen.aerzteblatt.de${urlPath}`;

        // Extract job ID from URL - must end with numeric ID
        const idMatch = urlPath.match(/.*-(\d+)$/);
        if (!idMatch) continue; // Skip if not a job URL
        const jobId = idMatch[1];

        // Extract 2000-char context around this link for parsing
        const matchIndex = match.index ?? 0;
        const contextStart = Math.max(0, matchIndex - 1000);
        const contextEnd = Math.min(html.length, matchIndex + 1000);
        const context = html.substring(contextStart, contextEnd);

        // Extract title (anchor text content)
        const titleMatch = context.match(new RegExp(`<a\\s+href="${urlPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>([^<]+)<\\/a>`));
        const title = titleMatch?.[1]?.trim() || "Assistenzarzt Position";

        // Extract company (text after date pattern)
        // Pattern: "17.02.2026, [Company Name]" or just company name
        const companyMatch = context.match(/\d{2}\.\d{2}\.\d{4},\s*([^\n<]+)/);
        const company = companyMatch?.[1]?.trim() || "";

        // Extract location (zip code + city pattern)
        const locationMatch = context.match(/(\d{5}\s+[A-Za-zäöüÄÖÜß\s\-]+)/);
        const location = locationMatch?.[1]?.trim() || "";

        // Dedup within page
        if (jobs.some((j) => j.guid === fullLink)) continue;

        jobs.push({
            title: cleanText(title),
            link: fullLink,
            company: cleanText(company),
            location: cleanText(location),
            guid: fullLink,
        });
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
    runId: string
): Promise<ScrapedJob[]> {
    const allJobs: ScrapedJob[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
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

/** Generate an AI summary for a job using Claude. */
async function generateAiSummary(
    job: ScrapedJob,
    apiKey: string
): Promise<string> {
    try {
        const contextParts = [
            `TITEL: ${job.title}`,
            job.company ? `ARBEITGEBER: ${job.company}` : null,
            job.location ? `STANDORT: ${job.location}` : null,
        ].filter(Boolean).join("\n");

        const prompt = `Basierend auf dieser Stellenanzeige, schreibe eine professionelle, einladende Zusammenfassung in 2-3 Sätzen auf Deutsch.
Beschreibe kurz: Was für eine Stelle/Klinik ist es, was sind die Hauptaufgaben, und was macht die Position attraktiv.

${contextParts}

Antworte NUR mit der Zusammenfassung, keine Anführungszeichen, keine Erklärungen.`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 250,
                system: "Du schreibst kurze, professionelle Stellenzusammenfassungen auf Deutsch. Antworte nur mit dem Text.",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) {
            console.error(`AI API error: ${response.status}`);
            return `${job.title}${job.company ? ` bei ${job.company}` : ""}${job.location ? ` in ${job.location}` : ""}.`;
        }

        const data = await response.json();
        const text = data.content?.[0]?.text?.trim();
        return text && text.length > 10
            ? text
            : `${job.title}${job.company ? ` bei ${job.company}` : ""}${job.location ? ` in ${job.location}` : ""}.`;
    } catch (err) {
        console.error("AI summary error:", err);
        return `${job.title}${job.company ? ` bei ${job.company}` : ""}${job.location ? ` in ${job.location}` : ""}.`;
    }
}

// ─── Main Handler ────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    const runId = generateRunId();
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

            // Extract JWT token
            const jwt = authHeader.replace('Bearer ', '');

            // Use anon key client with explicit JWT for verification
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

            // Verify JWT and get user
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

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

        if (lastRun) {
            const lastRunAge = Date.now() - new Date(lastRun.created_at).getTime();
            if (lastRunAge < 10 * 60 * 1000) { // 10 minutes cooldown
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: "Zu früh. Letzter Import vor weniger als 10 Minuten.",
                        lastRun: lastRun.created_at,
                    }),
                    { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
                );
            }
        }

        // Log run start
        await db.from("job_import_logs").insert({
            run_id: runId,
            action: "run_started",
            details: { sources: [STELLENMARKT_SOURCE, AERZTEBLATT_SOURCE], method: "html_scrape" },
        });

        // ── 1. Scrape search results pages from both sources in parallel ──
        console.log(`[${runId}] Scraping Assistenzarzt listings from multiple sources...`);

        const [stellenmarktJobs, aerzteblattJobs] = await Promise.all([
            // Stellenmarkt
            scrapeJobBoard(
                STELLENMARKT_URL,
                parseStellemarktPage,
                (base, page) => page === 1 ? base : `${base}?page=${page}`,
                runId
            ),

            // Ärzteblatt
            scrapeJobBoard(
                AERZTEBLATT_URL,
                parseAerzteblattPage,
                (base, page) => page === 1 ? base : `${base}?page=${page}`,
                runId
            ),
        ]);

        console.log(`[${runId}] Scraped totals: Stellenmarkt=${stellenmarktJobs.length}, Ärzteblatt=${aerzteblattJobs.length}`);

        // Tag jobs with their source
        interface ScrapedJobWithSource extends ScrapedJob {
            feedSource: string;
        }

        const allScrapedJobs: ScrapedJobWithSource[] = [
            ...stellenmarktJobs.map((j) => ({ ...j, feedSource: STELLENMARKT_SOURCE })),
            ...aerzteblattJobs.map((j) => ({ ...j, feedSource: AERZTEBLATT_SOURCE })),
        ];

        results.totalListings = allScrapedJobs.length;
        console.log(`[${runId}] Total: ${allScrapedJobs.length} listings from both sources`);

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
            .select("id, rss_guid, rss_content_hash, import_status, rss_feed_source")
            .in("rss_feed_source", [STELLENMARKT_SOURCE, AERZTEBLATT_SOURCE])
            .not("rss_guid", "is", null);

        const existingByGuid = new Map(
            (existingJobs ?? []).map((j: any) => [j.rss_guid, j])
        );

        const seenGuids = new Set<string>();
        const itemsToProcess = allScrapedJobs.slice(0, MAX_JOBS_PER_RUN * 2); // 100 total (50 per source)

        // ── 3. Process each listing ──
        for (const job of itemsToProcess) {
            seenGuids.add(job.guid);

            try {
                const contentHash = await sha256(job.title + job.company + job.location);
                const existing = existingByGuid.get(job.guid);
                const feedSource = job.feedSource;

                // Determine source display name
                const sourceName = feedSource === STELLENMARKT_SOURCE
                    ? "stellenmarkt.de"
                    : feedSource === AERZTEBLATT_SOURCE
                        ? "aerzteblatt.de"
                        : feedSource;

                if (existing) {
                    // Update last_seen
                    await db
                        .from("jobs")
                        .update({ rss_last_seen_at: new Date().toISOString() })
                        .eq("id", existing.id);

                    if (existing.rss_content_hash === contentHash) {
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

                    // Content changed
                    const newSummary = await generateAiSummary(job, anthropicKey);
                    await db
                        .from("jobs")
                        .update({
                            description: newSummary,
                            hospital_name: job.company || null,
                            location: job.location || null,
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
                    // New job
                    const summary = await generateAiSummary(job, anthropicKey);

                    const { data: inserted, error: insertErr } = await db
                        .from("jobs")
                        .insert({
                            title: job.title,
                            description: summary,
                            hospital_name: job.company || null,
                            location: job.location || null,
                            apply_url: job.link,
                            source_url: job.link,
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

        for (const source of [STELLENMARKT_SOURCE, AERZTEBLATT_SOURCE]) {
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

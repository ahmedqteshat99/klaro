import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enrichLocationWithState } from "../_shared/enrich-location.ts";

// ─── Configuration ───────────────────────────────────────────────
// Source identifiers
const STELLENMARKT_SOURCE = "stellenmarkt_medizin";
const AERZTEBLATT_SOURCE = "aerzteblatt";
const PRAKTISCHARZT_SOURCE = "praktischarzt";
const ETHIMEDIS_SOURCE = "ethimedis";

// Max pages per source (capped at 30 for Scrapling service timeout)
const MAX_PAGES_STELLENMARKT = 30;
const MAX_PAGES_AERZTEBLATT = 30;
const MAX_PAGES_PRAKTISCHARZT = 30;
const MAX_PAGES_ETHIMEDIS = 20;
const MAX_JOBS_PER_RUN = 300; // Safe for single source imports (with timeout safety)

// ─── Scrapling Service ──────────────────────────────────────────
const SCRAPER_SERVICE_URL = Deno.env.get("SCRAPER_SERVICE_URL") || "";
const SCRAPER_SECRET_KEY = Deno.env.get("SCRAPER_SECRET") || "";

/** Call the external Scrapling microservice to scrape a source. */
async function scrapeViaService(source: string, maxPages: number, runId: string): Promise<ScrapedJob[]> {
    if (!SCRAPER_SERVICE_URL) {
        throw new Error("SCRAPER_SERVICE_URL not configured");
    }

    console.log(`[${runId}] Using Scrapling service for source: ${source}`);

    const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Scraper-Secret": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ source, max_pages: maxPages }),
        signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Scraper service returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Scraper failed: ${(data.errors || []).join(", ")}`);
    }

    console.log(`[${runId}] Scrapling service returned ${data.jobs.length} jobs for ${source}`);

    return (data.jobs || []).map((j: any) => ({
        title: j.title || "",
        link: j.link || "",
        company: j.company || "",
        location: j.location || "",
        guid: j.guid || "",
        employerUrl: j.employer_url || undefined,
        nodeId: j.node_id || undefined,
    }));
}

/** Resolve employer URL via the Scrapling microservice. */
async function resolveEmployerUrlViaService(
    jobPageUrl: string,
    source: string,
    nodeId?: string
): Promise<string | null> {
    if (!SCRAPER_SERVICE_URL) return null;
    try {
        const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape/resolve-employer-url`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Scraper-Secret": SCRAPER_SECRET_KEY,
            },
            body: JSON.stringify({ job_url: jobPageUrl, source, node_id: nodeId }),
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.employer_url || null;
    } catch {
        return null;
    }
}

/** Max pages config per source. */
const MAX_PAGES_CONFIG: Record<string, number> = {
    [STELLENMARKT_SOURCE]: MAX_PAGES_STELLENMARKT,
    [AERZTEBLATT_SOURCE]: MAX_PAGES_AERZTEBLATT,
    [PRAKTISCHARZT_SOURCE]: MAX_PAGES_PRAKTISCHARZT,
    [ETHIMEDIS_SOURCE]: MAX_PAGES_ETHIMEDIS,
};

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

interface ScrapedJob {
    title: string;
    link: string;
    company: string;
    location: string;
    guid: string; // The anzeige URL as unique identifier
    employerUrl?: string; // Direct employer application URL (resolved from detail page)
    nodeId?: string; // Ärzteblatt node ID for efficient URL resolution
}

// Medical department terms — used to detect bad locations and prevent false positives
const MEDICAL_TERMS = new Set([
    "radiologie", "kardiologie", "chirurgie", "anästhesie", "anasthesie",
    "neurologie", "gynäkologie", "gynakologie", "pädiatrie", "padiatrie",
    "psychiatrie", "orthopädie", "orthopadie", "urologie", "dermatologie",
    "onkologie", "pneumologie", "nephrologie", "gastroenterologie",
    "innere medizin", "intensivmedizin", "notaufnahme", "allgemeinmedizin",
    "nuklearmedizin", "pathologie", "hämatologie", "hamatologie",
    "endokrinologie", "rheumatologie", "geriatrie", "neonatologie",
    "weiterbildung", "facharzt", "oberarzt", "assistenzarzt",
    "gefäßchirurgie", "unfallchirurgie", "viszeralchirurgie",
    "herzchirurgie", "thoraxchirurgie", "kinderchirurgie",
    "hals-nasen-ohrenheilkunde", "augenheilkunde", "palliativmedizin",
    "arbeitsmedizin", "rechtsmedizin", "mikrobiologie", "virologie",
    "transfusionsmedizin", "strahlentherapie", "laboratoriumsmedizin",
]);

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
            details: {
                sources: sourcesToScrape,
                method: "scrapling_service",
            },
        });

        // ── 1. Scrape search results pages from requested sources in parallel ──
        console.log(`[${runId}] Scraping Assistenzarzt listings from: ${sourcesToScrape.join(", ")}`);

        /** Scrape a single source via the Scrapling microservice. */
        async function scrapeSource(source: string): Promise<ScrapedJob[]> {
            if (!sourcesToScrape.includes(source)) return [];
            const maxPages = MAX_PAGES_CONFIG[source] || 30;
            return scrapeViaService(source, maxPages, runId);
        }

        const [
            stellenmarktJobs,
            aerzteblattJobs,
            praktischArztJobs,
            ethimedisJobs,
        ] = await Promise.all([
            scrapeSource(STELLENMARKT_SOURCE),
            scrapeSource(AERZTEBLATT_SOURCE),
            scrapeSource(PRAKTISCHARZT_SOURCE),
            scrapeSource(ETHIMEDIS_SOURCE),
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
                    message: `Keine Stellenangebote von ${sourcesToScrape.join(", ")} gefunden. Möglicherweise ist der Scraper-Service nicht erreichbar.`,
                }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        // ── 2. Load existing jobs for dedup + expiration tracking ──
        const { data: existingJobs } = await db
            .from("jobs")
            .select("id, rss_guid, rss_content_hash, import_status, rss_feed_source, apply_url, location, consecutive_misses")
            .in("rss_feed_source", sourcesToScrape)
            .not("rss_guid", "is", null);

        const existingByGuid = new Map(
            (existingJobs ?? []).map((j: any) => [j.rss_guid, j])
        );

        const seenGuids = new Set<string>();
        const itemsToProcess = allScrapedJobs.slice(0, MAX_JOBS_PER_RUN * sourcesToScrape.length);
        let urlBackfillCount = 0;
        const MAX_URL_BACKFILLS_PER_RUN = 15; // Conservative limit to avoid Edge Function timeout (15 URLs × 15s = 225s max)

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
                    // Update last_seen and reset consecutive miss counter
                    await db
                        .from("jobs")
                        .update({
                            rss_last_seen_at: new Date().toISOString(),
                            consecutive_misses: 0,
                        })
                        .eq("id", existing.id);

                    // Backfill employer URL for ANY job with aggregator URL, regardless of content hash
                    const currentUrl = (existing as any).apply_url as string | null;
                    const needsUrlBackfill = currentUrl &&
                        aggregatorDomains.some((d) => currentUrl.includes(d));

                    if (needsUrlBackfill && urlBackfillCount < MAX_URL_BACKFILLS_PER_RUN) {
                        const backfilledUrl = await resolveEmployerUrlViaService(job.link, feedSource, job.nodeId);
                        if (backfilledUrl) {
                            await db
                                .from("jobs")
                                .update({ apply_url: backfilledUrl, source_url: backfilledUrl })
                                .eq("id", (existing as any).id);
                            console.log(`[${runId}] Backfilled employer URL for "${job.title}": ${backfilledUrl}`);
                        }
                        urlBackfillCount++;
                    }

                    if (existing.rss_content_hash === contentHash) {

                        // Backfill location: fix missing/wrong locations (e.g. medical terms stored as cities)
                        const dbLocation = (existing as any).location as string | null;
                        const dbLocationBad = !dbLocation || dbLocation.length < 3 ||
                            MEDICAL_TERMS.has((dbLocation || "").toLowerCase().trim());

                        if (dbLocationBad && job.location) {
                            // Fresh scrape has a valid location — overwrite the bad one
                            const enrichedLoc = enrichLocationWithState(job.location);
                            await db
                                .from("jobs")
                                .update({ location: enrichedLoc })
                                .eq("id", (existing as any).id);
                            console.log(`[${runId}] Fixed location for "${job.title}": ${enrichedLoc}`);
                        } else if (dbLocation) {
                            // Existing location is OK — just try to enrich with Bundesland
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

                    // Content changed — re-resolve employer URL
                    const updatedEmployerUrl = await resolveEmployerUrlViaService(job.link, feedSource, job.nodeId);
                    if (updatedEmployerUrl) console.log(`[${runId}] Resolved employer URL: ${updatedEmployerUrl}`);

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
                    // New job — resolve employer URL via Scrapling service
                    const employerUrl = await resolveEmployerUrlViaService(job.link, feedSource, job.nodeId);
                    if (employerUrl) console.log(`[${runId}] Resolved employer URL: ${employerUrl}`);

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

        // ── 4. Track consecutive misses and expire stale jobs ──
        // Consecutive miss thresholds (at 4h cron interval):
        //   pending_review: 3 misses ≈ 12h absent from feed
        //   published:      5 misses ≈ 20h absent from feed (more conservative)
        const MISS_THRESHOLD_PENDING = 3;
        const MISS_THRESHOLD_PUBLISHED = 5;

        for (const source of sourcesToScrape) {
            const seenGuidsForSource = new Set(
                allScrapedJobs
                    .filter((j) => j.feedSource === source)
                    .map((j) => j.guid)
            );

            for (const [guid, existing] of existingByGuid) {
                const ex = existing as any;
                if (ex.rss_feed_source !== source) continue;
                if (seenGuidsForSource.has(guid)) continue; // Still in feed — already reset above

                const currentMisses = ex.consecutive_misses || 0;
                const newMissCount = currentMisses + 1;

                // Increment consecutive miss counter
                await db
                    .from("jobs")
                    .update({ consecutive_misses: newMissCount })
                    .eq("id", ex.id);

                // Expire pending_review jobs after threshold
                if (ex.import_status === "pending_review" && newMissCount >= MISS_THRESHOLD_PENDING) {
                    await db
                        .from("jobs")
                        .update({ import_status: "expired" })
                        .eq("id", ex.id);

                    results.expired++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "expired",
                        rss_guid: guid,
                        job_id: ex.id,
                        details: { consecutive_misses: newMissCount, source, status: "pending_review" },
                    });
                    console.log(`[${runId}] Expired pending job after ${newMissCount} misses: ${guid}`);
                }

                // Expire published RSS jobs after higher threshold
                // Manual jobs (no rss_feed_source) are never auto-expired
                if (ex.import_status === "published" && ex.rss_feed_source && newMissCount >= MISS_THRESHOLD_PUBLISHED) {
                    await db
                        .from("jobs")
                        .update({ import_status: "expired", is_published: false, published_at: null })
                        .eq("id", ex.id);

                    results.expired++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "expired",
                        rss_guid: guid,
                        job_id: ex.id,
                        details: { consecutive_misses: newMissCount, source, status: "published" },
                    });
                    console.log(`[${runId}] Expired published job after ${newMissCount} misses: ${guid}`);
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

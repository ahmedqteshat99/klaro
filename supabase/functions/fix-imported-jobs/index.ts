import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enrichLocationWithState } from "../_shared/enrich-location.ts";

// ─── Configuration ──────────────────────────────────────────────
const SCRAPER_SERVICE_URL = Deno.env.get("SCRAPER_SERVICE_URL") || "";
const SCRAPER_SECRET_KEY = Deno.env.get("SCRAPER_SECRET") || "";
const CUTOFF_TIMESTAMP = "2026-03-01 19:49:00+00";

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

/** Check if URL contains aggregator domain. */
function hasAggregatorUrl(url: string | null): boolean {
    if (!url) return false;
    const aggregatorDomains = ["stellenmarkt.de", "aerzteblatt.de", "praktischarzt.de", "ethimedis.de"];
    return aggregatorDomains.some(d => url.includes(d));
}

/** Extract location from job fields. */
async function extractLocationFromJob(job: any): Promise<string | null> {
    const MEDICAL_TERMS = new Set([
        "radiologie", "kardiologie", "chirurgie", "anästhesie", "anasthesie",
        "neurologie", "gynäkologie", "gynakologie", "pädiatrie", "padiatrie",
        "psychiatrie", "orthopädie", "orthopadie", "urologie", "dermatologie",
        "onkologie", "pneumologie", "nephrologie", "gastroenterologie",
        "innere", "intensivmedizin", "notaufnahme", "allgemeinmedizin",
        "nuklearmedizin", "pathologie", "hämatologie", "hamatologie",
        "endokrinologie", "rheumatologie", "geriatrie", "neonatologie",
        "weiterbildung", "facharzt", "oberarzt", "assistenzarzt",
        "gefäßchirurgie", "unfallchirurgie", "viszeralchirurgie",
        "herzchirurgie", "thoraxchirurgie", "kinderchirurgie",
        "hals-nasen-ohrenheilkunde", "augenheilkunde", "palliativmedizin",
        "arbeitsmedizin", "rechtsmedizin", "mikrobiologie", "virologie",
        "transfusionsmedizin", "strahlentherapie", "laboratoriumsmedizin",
        "klinik", "klinikum", "krankenhaus", "hospital", "praxis",
    ]);

    // Strategy 1: Extract from hospital_name
    if (job.hospital_name) {
        const enriched = enrichLocationWithState(job.hospital_name);
        if (enriched.includes(',')) {
            return enriched;
        }
    }

    // Strategy 2: Extract PLZ+Stadt from title or description
    const textToSearch = `${job.title || ''} ${job.description || ''}`;
    const plzMatch = textToSearch.match(/\b(\d{5})\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\s\-]+)/);
    if (plzMatch) {
        const locationCandidate = `${plzMatch[1]} ${plzMatch[2].trim()}`;
        const enriched = enrichLocationWithState(locationCandidate);
        return enriched;
    }

    // Strategy 3: Extract city name from description with common patterns
    if (job.description) {
        const cityPattern = /(?:in|Standort:|Location:|Ort:)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zäöü]+)?)/;
        const cityMatch = job.description.match(cityPattern);
        if (cityMatch) {
            const candidate = cityMatch[1].trim();
            if (!MEDICAL_TERMS.has(candidate.toLowerCase())) {
                const enriched = enrichLocationWithState(candidate);
                if (enriched.includes(',')) {
                    return enriched;
                }
            }
        }
    }

    // Strategy 4: Try just the first word of hospital name
    if (job.hospital_name) {
        const firstWord = job.hospital_name.split(/[\s,]+/)[0];
        if (firstWord && firstWord.length >= 3) {
            const enriched = enrichLocationWithState(firstWord);
            if (enriched.includes(',')) {
                return enriched;
            }
        }
    }

    return null;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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

            const supabaseClient = createClient(supabaseUrl, anonKey, {
                global: { headers: { Authorization: authHeader } },
            });

            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

            if (userError || !user) {
                return new Response(JSON.stringify({ error: "Authentifizierung fehlgeschlagen" }), {
                    status: 401,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }

            const dbAdmin = createClient(supabaseUrl, serviceRoleKey);
            const { data: roleData, error: roleError } = await dbAdmin
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (roleError || roleData?.role !== "ADMIN") {
                return new Response(JSON.stringify({ error: "Nur Admins" }), {
                    status: 403,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
        }

        const db = createClient(supabaseUrl, serviceRoleKey);

        console.log(`[fix-imported-jobs] Starting retroactive fix for jobs after ${CUTOFF_TIMESTAMP}`);

        // Query affected jobs (with aggregator URLs or missing locations)
        const { data: jobs, error: fetchErr } = await db
            .from("jobs")
            .select("id, title, apply_url, location, link, rss_feed_source, rss_node_id, hospital_name, description")
            .gt("rss_imported_at", CUTOFF_TIMESTAMP)
            .in("rss_feed_source", ["stellenmarkt_medizin", "aerzteblatt", "praktischarzt", "ethimedis"])
            .order("rss_imported_at", { ascending: false })
            .limit(500);

        if (fetchErr) throw fetchErr;

        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No jobs found to fix",
                    processed: 0,
                    urlsFixed: 0,
                    locationsFixed: 0
                }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        console.log(`[fix-imported-jobs] Found ${jobs.length} jobs to process`);

        // Filter jobs that need fixing
        const jobsNeedingUrlFix = jobs.filter(j => hasAggregatorUrl(j.apply_url));
        const jobsNeedingLocationFix = jobs.filter(j => !j.location || j.location.length < 3);

        console.log(`[fix-imported-jobs] ${jobsNeedingUrlFix.length} jobs need URL fix`);
        console.log(`[fix-imported-jobs] ${jobsNeedingLocationFix.length} jobs need location fix`);

        let urlsFixed = 0;
        let urlsFailed = 0;

        // Fix URLs in batches
        for (const job of jobsNeedingUrlFix) {
            try {
                const employerUrl = await resolveEmployerUrlViaService(
                    job.link,
                    job.rss_feed_source,
                    job.rss_node_id
                );

                if (employerUrl && !hasAggregatorUrl(employerUrl)) {
                    await db.from("jobs").update({
                        apply_url: employerUrl,
                        source_url: employerUrl
                    }).eq("id", job.id);
                    console.log(`[fix-imported-jobs] ✓ URL fixed for job ${job.id}: ${employerUrl}`);
                    urlsFixed++;
                } else {
                    console.log(`[fix-imported-jobs] ✗ Could not resolve URL for job ${job.id}`);
                    urlsFailed++;
                }
            } catch (err) {
                console.error(`[fix-imported-jobs] Error fixing URL for job ${job.id}:`, err);
                urlsFailed++;
            }
        }

        let locationsFixed = 0;
        let locationsFailed = 0;

        // Fix locations
        for (const job of jobsNeedingLocationFix) {
            try {
                const location = await extractLocationFromJob(job);
                if (location) {
                    await db.from("jobs").update({ location }).eq("id", job.id);
                    console.log(`[fix-imported-jobs] ✓ Location fixed for job ${job.id}: ${location}`);
                    locationsFixed++;
                } else {
                    console.log(`[fix-imported-jobs] ✗ Could not extract location for job ${job.id}`);
                    locationsFailed++;
                }
            } catch (err) {
                console.error(`[fix-imported-jobs] Error fixing location for job ${job.id}:`, err);
                locationsFailed++;
            }
        }

        const summary = {
            success: true,
            cutoff_timestamp: CUTOFF_TIMESTAMP,
            processed: jobs.length,
            urls: {
                needed_fix: jobsNeedingUrlFix.length,
                fixed: urlsFixed,
                failed: urlsFailed
            },
            locations: {
                needed_fix: jobsNeedingLocationFix.length,
                fixed: locationsFixed,
                failed: locationsFailed
            }
        };

        console.log(`[fix-imported-jobs] Summary:`, summary);

        return new Response(
            JSON.stringify(summary),
            { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("[fix-imported-jobs] Fatal error:", err);
        return new Response(
            JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : "Unknown error"
            }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

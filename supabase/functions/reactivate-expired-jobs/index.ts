import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ──────────────────────────────────────────────
const SCRAPER_SERVICE_URL = Deno.env.get("SCRAPER_SERVICE_URL") || "";
const SCRAPER_SECRET_KEY = Deno.env.get("SCRAPER_SECRET") || "";
const MAX_JOBS_PER_RUN = 500; // Higher limit for cleanup script
const BATCH_SIZE = 200; // Scraper service limit per request

interface LinkCheckResult {
    id: string;
    url: string;
    status: "active" | "stale" | "error" | "unknown";
    http_status?: number;
    reason?: string;
}

/** Check links via the Scrapling microservice (content-aware detection). */
async function checkLinksViaService(
    urls: Array<{ id: string; url: string; source: string }>
): Promise<LinkCheckResult[]> {
    if (!SCRAPER_SERVICE_URL) {
        throw new Error("SCRAPER_SERVICE_URL not configured");
    }

    const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape/check-links`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Scraper-Secret": SCRAPER_SECRET_KEY,
        },
        body: JSON.stringify({ urls }),
        signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Scraper service returned ${response.status}: ${text}`);
    }

    const data = await response.json();
    return data.results || [];
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    try {
        // No auth required - this is a one-time cleanup script
        // WARNING: Remove this function after running or add auth for production
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        console.log("Starting reactivate-expired-jobs cleanup...");

        // ── Load expired jobs with apply_url ──
        const db = createClient(supabaseUrl, serviceRoleKey);

        console.log("Fetching expired jobs with URLs...");

        console.log("Fetching expired jobs with URLs...");

        const { data: jobs, error: fetchErr } = await db
            .from("jobs")
            .select("id, apply_url, title, rss_feed_source, rss_guid, link_failure_count, import_status, link_checked_at")
            .eq("import_status", "expired")
            .not("apply_url", "is", null)
            .neq("apply_url", "")
            .order("id", { ascending: true })
            .limit(MAX_JOBS_PER_RUN);

        console.log(`Query returned ${jobs?.length || 0} expired jobs`);

        if (fetchErr) throw fetchErr;
        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No expired jobs with URLs found",
                    checked: 0,
                    reactivated: 0
                }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        console.log(`Found ${jobs.length} expired jobs to check...`);

        // ── Send batches to Scrapling service ──
        const urlsToCheck = jobs.map((j: any) => ({
            id: j.id,
            url: j.apply_url,
            source: j.rss_feed_source || "",
        }));

        // Process in batches of 200
        const allResults: LinkCheckResult[] = [];
        for (let i = 0; i < urlsToCheck.length; i += BATCH_SIZE) {
            const batch = urlsToCheck.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(urlsToCheck.length / BATCH_SIZE)} (${batch.length} jobs)...`);
            const batchResults = await checkLinksViaService(batch);
            allResults.push(...batchResults);
        }

        const results = allResults;

        // Index results by ID for fast lookup
        const resultById = new Map(results.map((r) => [r.id, r]));

        // ── Reactivate jobs with active links ──
        const now = new Date().toISOString();
        let reactivated = 0;
        let stillDead = 0;
        let unknown = 0;
        const reactivatedJobs: Array<{ id: string; title: string; url: string }> = [];

        for (const job of jobs) {
            const result = resultById.get(job.id);
            if (!result) continue;

            if (result.status === "active") {
                // Link is active - reactivate the job!
                console.log(`Reactivating job ${job.id}: "${(job as any).title}"`);

                const { error: updateError, data: updateData } = await db
                    .from("jobs")
                    .update({
                        import_status: "published",
                        is_published: true,
                        published_at: now,
                        link_status: "active",
                        link_checked_at: now,
                        link_failure_count: 0,
                    })
                    .eq("id", job.id)
                    .select();

                if (updateError) {
                    console.error(`Failed to reactivate job ${job.id}:`, updateError);
                    continue;
                }

                console.log(`Successfully updated job ${job.id}, rows affected: ${updateData?.length || 0}`);

                // Verify the update
                const { data: verifyData } = await db
                    .from("jobs")
                    .select("id, import_status, is_published")
                    .eq("id", job.id)
                    .single();

                console.log(`Verification for job ${job.id}:`, verifyData);

                // Log reactivation event
                await db.from("job_import_logs").insert({
                    run_id: `reactivate-${now}`,
                    action: "reactivated",
                    rss_guid: (job as any).rss_guid || null,
                    job_id: job.id,
                    job_title: (job as any).title,
                    details: {
                        reason: "link_validation_passed",
                        link_status: "active",
                        http_status: result.http_status,
                        previous_status: "expired",
                    },
                });

                reactivated++;
                reactivatedJobs.push({
                    id: job.id,
                    title: (job as any).title,
                    url: (job as any).apply_url,
                });

                console.log(`Reactivated: "${(job as any).title}" - link is active`);
            } else if (result.status === "stale" || result.status === "error") {
                // Link is still dead - just update the check timestamp
                await db
                    .from("jobs")
                    .update({
                        link_status: result.status,
                        link_checked_at: now,
                    })
                    .eq("id", job.id);
                stillDead++;
            } else {
                // Unknown status
                await db
                    .from("jobs")
                    .update({
                        link_status: "unknown",
                        link_checked_at: now,
                    })
                    .eq("id", job.id);
                unknown++;
            }
        }

        // ── Summary ──
        const summary = {
            success: true,
            checked: results.length,
            reactivated,
            stillDead,
            unknown,
            reactivatedJobs: reactivatedJobs.slice(0, 50), // Limit to first 50 for response size
            processedJobIds: jobs.slice(0, 10).map((j: any) => j.id), // First 10 IDs for debugging
            reactivatedJobIds: reactivatedJobs.slice(0, 10).map(j => j.id), // First 10 reactivated IDs
            message: reactivated > 0
                ? `Successfully reactivated ${reactivated} job(s) with active links`
                : "No jobs were reactivated (all expired jobs still have dead links)",
        };

        console.log(`Cleanup complete: ${JSON.stringify(summary)}`);

        return new Response(JSON.stringify(summary), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Fatal error:", err);
        return new Response(
            JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : "Unbekannter Fehler"
            }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

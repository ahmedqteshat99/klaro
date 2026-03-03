import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ──────────────────────────────────────────────
const SCRAPER_SERVICE_URL = Deno.env.get("SCRAPER_SERVICE_URL") || "";
const SCRAPER_SECRET_KEY = Deno.env.get("SCRAPER_SECRET") || "";
const MAX_JOBS_PER_RUN = 200;
const AUTO_DEACTIVATE_THRESHOLD = 3; // Consecutive failures before auto-unpublish

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
        // ── Auth: admin only or CRON_SECRET ──
        const authHeader = req.headers.get("Authorization");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

            const supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
                global: { headers: { Authorization: authHeader } },
            });

            const { data: userData, error: userError } = await supabaseClient.auth.getUser();
            if (userError || !userData?.user) {
                return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
                    status: 401,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }

            const { data: roleData } = await supabaseClient
                .from("profiles")
                .select("role")
                .eq("user_id", userData.user.id)
                .single();

            if (roleData?.role !== "ADMIN") {
                return new Response(JSON.stringify({ error: "Nur Admins" }), {
                    status: 403,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
        }

        // ── Load published jobs with apply_url ──
        const db = createClient(supabaseUrl, serviceRoleKey);

        const { data: jobs, error: fetchErr } = await db
            .from("jobs")
            .select("id, apply_url, title, rss_feed_source, link_failure_count, is_published")
            .eq("is_published", true)
            .not("apply_url", "is", null)
            .neq("apply_url", "")
            .order("link_checked_at", { ascending: true, nullsFirst: true })
            .limit(MAX_JOBS_PER_RUN);

        if (fetchErr) throw fetchErr;
        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({ success: true, checked: 0, active: 0, stale: 0, errors: 0 }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        console.log(`Checking ${jobs.length} job URLs via Scrapling service...`);

        // ── Send batch to Scrapling service ──
        const urlsToCheck = jobs.map((j: any) => ({
            id: j.id,
            url: j.apply_url,
            source: j.rss_feed_source || "",
        }));

        const results = await checkLinksViaService(urlsToCheck);

        // Index results by ID for fast lookup
        const resultById = new Map(results.map((r) => [r.id, r]));

        // ── Update job statuses in DB ──
        const now = new Date().toISOString();
        let autoDeactivated = 0;

        for (const job of jobs) {
            const result = resultById.get(job.id);
            if (!result) continue;

            const currentFailCount = (job as any).link_failure_count || 0;

            if (result.status === "active") {
                // Link is healthy — reset failure counter
                await db
                    .from("jobs")
                    .update({
                        link_status: "active",
                        link_checked_at: now,
                        link_failure_count: 0,
                    })
                    .eq("id", job.id);
            } else if (result.status === "stale" || result.status === "error") {
                const newFailCount = currentFailCount + 1;

                if (newFailCount >= AUTO_DEACTIVATE_THRESHOLD && (job as any).is_published) {
                    // Auto-deactivate after consecutive failures
                    await db
                        .from("jobs")
                        .update({
                            link_status: result.status,
                            link_checked_at: now,
                            link_failure_count: newFailCount,
                            is_published: false,
                            published_at: null,
                        })
                        .eq("id", job.id);
                    autoDeactivated++;
                    console.log(
                        `Auto-deactivated "${(job as any).title}" after ${newFailCount} failures ` +
                        `(reason: ${result.reason || result.status})`
                    );
                } else {
                    await db
                        .from("jobs")
                        .update({
                            link_status: result.status,
                            link_checked_at: now,
                            link_failure_count: newFailCount,
                        })
                        .eq("id", job.id);
                }
            } else {
                // unknown — update status but don't increment failure counter
                await db
                    .from("jobs")
                    .update({
                        link_status: result.status,
                        link_checked_at: now,
                    })
                    .eq("id", job.id);
            }
        }

        // ── Summary ──
        const summary = {
            success: true,
            checked: results.length,
            active: results.filter((r) => r.status === "active").length,
            stale: results.filter((r) => r.status === "stale").length,
            errors: results.filter((r) => r.status === "error").length,
            unknown: results.filter((r) => r.status === "unknown").length,
            autoDeactivated,
            staleJobs: results
                .filter((r) => r.status === "stale")
                .map((r) => ({ id: r.id, url: r.url, httpStatus: r.http_status, reason: r.reason })),
        };

        console.log(`Check complete: ${JSON.stringify(summary)}`);

        return new Response(JSON.stringify(summary), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Fatal error:", err);
        return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

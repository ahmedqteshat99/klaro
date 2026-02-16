import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const BATCH_SIZE = 5; // concurrent HEAD requests
const REQUEST_TIMEOUT_MS = 10_000;

interface CheckResult {
    jobId: string;
    url: string;
    status: "active" | "stale" | "error" | "unknown";
    httpStatus?: number;
    errorMsg?: string;
}

/** Check if a URL is still reachable. */
async function checkUrl(url: string): Promise<{ status: "active" | "stale" | "error" | "unknown"; httpStatus?: number; errorMsg?: string }> {
    try {
        const response = await fetch(url, {
            method: "HEAD",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        const code = response.status;

        // Some servers don't support HEAD, try GET as fallback for 405
        if (code === 405) {
            const getResp = await fetch(url, {
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html",
                },
                redirect: "follow",
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            const getCode = getResp.status;
            // Consume body to prevent leak
            await getResp.text().catch(() => { });

            if (getCode >= 200 && getCode < 400) return { status: "active", httpStatus: getCode };
            if (getCode === 404 || getCode === 410) return { status: "stale", httpStatus: getCode };
            if (getCode >= 500) return { status: "error", httpStatus: getCode };
            return { status: "unknown", httpStatus: getCode };
        }

        if (code >= 200 && code < 400) return { status: "active", httpStatus: code };
        if (code === 404 || code === 410) return { status: "stale", httpStatus: code };
        if (code >= 500) return { status: "error", httpStatus: code };
        return { status: "unknown", httpStatus: code };
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        if (msg.includes("timeout") || msg.includes("abort")) {
            return { status: "unknown", errorMsg: "Timeout" };
        }
        return { status: "error", errorMsg: msg };
    }
}

/** Process a batch of URLs in parallel. */
async function processBatch(
    jobs: Array<{ id: string; apply_url: string }>,
): Promise<CheckResult[]> {
    return Promise.all(
        jobs.map(async (job) => {
            const result = await checkUrl(job.apply_url);
            return {
                jobId: job.id,
                url: job.apply_url,
                ...result,
            };
        })
    );
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    try {
        // ── Auth: admin only ──
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
            .select("id, apply_url, title")
            .eq("is_published", true)
            .not("apply_url", "is", null)
            .neq("apply_url", "");

        if (fetchErr) throw fetchErr;
        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({ success: true, checked: 0, active: 0, stale: 0, errors: 0 }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        console.log(`Checking ${jobs.length} job URLs...`);

        // ── Process in batches ──
        const allResults: CheckResult[] = [];
        const validJobs = jobs.filter((j) => j.apply_url);

        for (let i = 0; i < validJobs.length; i += BATCH_SIZE) {
            const batch = validJobs.slice(i, i + BATCH_SIZE);
            const results = await processBatch(batch as Array<{ id: string; apply_url: string }>);
            allResults.push(...results);

            // Brief delay between batches to be polite
            if (i + BATCH_SIZE < validJobs.length) {
                await new Promise((r) => setTimeout(r, 500));
            }
        }

        // ── Update job statuses in DB ──
        const now = new Date().toISOString();
        for (const result of allResults) {
            await db
                .from("jobs")
                .update({
                    link_status: result.status,
                    link_checked_at: now,
                })
                .eq("id", result.jobId);
        }

        // ── Summary ──
        const summary = {
            success: true,
            checked: allResults.length,
            active: allResults.filter((r) => r.status === "active").length,
            stale: allResults.filter((r) => r.status === "stale").length,
            errors: allResults.filter((r) => r.status === "error").length,
            unknown: allResults.filter((r) => r.status === "unknown").length,
            staleJobs: allResults
                .filter((r) => r.status === "stale")
                .map((r) => ({ id: r.jobId, url: r.url, httpStatus: r.httpStatus })),
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

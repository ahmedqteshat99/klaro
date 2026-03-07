import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ──────────────────────────────────────────────
const SCRAPER_SERVICE_URL = Deno.env.get("SCRAPER_SERVICE_URL") || "";
const SCRAPER_SECRET_KEY = Deno.env.get("SCRAPER_SECRET") || "";
const MAX_PAGES = 30; // Cover ~450 jobs (30 pages × 15 jobs/page)

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

        console.log(`[fix-praktischarzt-jobs] Starting fix for PraktischArzt jobs with missing data`);

        // Query PraktischArzt jobs with missing location or hospital_name
        const { data: jobs, error: fetchErr } = await db
            .from("jobs")
            .select("id, rss_guid, location, hospital_name, title")
            .eq("rss_feed_source", "praktischarzt")
            .or("location.is.null,hospital_name.is.null,location.eq.,hospital_name.eq.")
            .limit(500);

        if (fetchErr) throw fetchErr;

        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    message: "No PraktischArzt jobs need fixing",
                    total: 0,
                    updated: 0
                }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        console.log(`[fix-praktischarzt-jobs] Found ${jobs.length} jobs needing data`);

        // Call scraper service to get fresh PraktischArzt data
        if (!SCRAPER_SERVICE_URL) {
            throw new Error("SCRAPER_SERVICE_URL not configured");
        }

        console.log(`[fix-praktischarzt-jobs] Calling scraper service for PraktischArzt (${MAX_PAGES} pages)...`);

        const response = await fetch(`${SCRAPER_SERVICE_URL}/scrape`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Scraper-Secret": SCRAPER_SECRET_KEY,
            },
            body: JSON.stringify({
                source: "praktischarzt",
                max_pages: MAX_PAGES
            }),
            signal: AbortSignal.timeout(120_000), // 2 min timeout
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Scraper service returned ${response.status}: ${text}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(`Scraper failed: ${(data.errors || []).join(", ")}`);
        }

        const scrapedJobs = data.jobs || [];
        console.log(`[fix-praktischarzt-jobs] Scraper returned ${scrapedJobs.length} jobs`);

        // Build map of scraped jobs by guid (job URL)
        const scrapedJobsMap = new Map(
            scrapedJobs.map((j: any) => [j.guid, j])
        );

        let updated = 0;
        let notFound = 0;
        let failed = 0;
        const failures: string[] = [];
        const debugSamples: any[] = [];

        // Match and update
        for (const dbJob of jobs) {
            try {
                const scraped = scrapedJobsMap.get(dbJob.rss_guid);

                if (!scraped) {
                    // Job no longer on site (expired)
                    console.log(`[fix-praktischarzt-jobs] ✗ Job not found on site: ${dbJob.title}`);
                    notFound++;
                    continue;
                }

                // DEBUG: Collect sample data for the first few jobs
                if (debugSamples.length < 5) {
                    debugSamples.push({
                        db_job: {
                            title: dbJob.title,
                            location: dbJob.location,
                            hospital_name: dbJob.hospital_name
                        },
                        scraped_data: {
                            company: scraped.company,
                            location: scraped.location,
                            guid: scraped.guid
                        }
                    });
                }

                const updates: any = {};

                // Update hospital_name if missing
                if ((!dbJob.hospital_name || dbJob.hospital_name === "") && scraped.company) {
                    updates.hospital_name = scraped.company;
                }

                // Update location if missing
                if ((!dbJob.location || dbJob.location === "") && scraped.location) {
                    updates.location = scraped.location;
                }

                if (Object.keys(updates).length > 0) {
                    const { error: updateErr } = await db
                        .from("jobs")
                        .update(updates)
                        .eq("id", dbJob.id);

                    if (updateErr) {
                        console.error(`[fix-praktischarzt-jobs] Failed to update job ${dbJob.id}:`, updateErr);
                        failures.push(`${dbJob.id}: ${updateErr.message}`);
                        failed++;
                    } else {
                        console.log(`[fix-praktischarzt-jobs] ✓ Updated job ${dbJob.id}:`, updates);
                        updated++;
                    }
                } else {
                    console.log(`[fix-praktischarzt-jobs] • Job ${dbJob.id} already has complete data`);
                }
            } catch (err) {
                console.error(`[fix-praktischarzt-jobs] Error processing job ${dbJob.id}:`, err);
                failures.push(`${dbJob.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                failed++;
            }
        }

        const summary = {
            success: true,
            total: jobs.length,
            scraped: scrapedJobs.length,
            updated,
            not_found: notFound,
            failed,
            failures: failures.slice(0, 10), // First 10 failures
            debug_samples: debugSamples, // Debug: show what scraper returned
        };

        console.log(`[fix-praktischarzt-jobs] Summary:`, summary);

        return new Response(
            JSON.stringify(summary),
            { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );

    } catch (err) {
        console.error("[fix-praktischarzt-jobs] Fatal error:", err);
        return new Response(
            JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : "Unknown error"
            }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enrichLocationWithState } from "../_shared/enrich-location.ts";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    try {
        // ── Auth: admin or cron ──
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

        // ── Load all jobs with a location ──
        const db = createClient(supabaseUrl, serviceRoleKey);

        const { data: jobs, error: fetchErr } = await db
            .from("jobs")
            .select("id, location")
            .not("location", "is", null)
            .neq("location", "");

        if (fetchErr) throw fetchErr;
        if (!jobs || jobs.length === 0) {
            return new Response(
                JSON.stringify({ success: true, total: 0, enriched: 0, unchanged: 0 }),
                { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing ${jobs.length} jobs for state enrichment...`);

        let enriched = 0;
        let unchanged = 0;

        for (const job of jobs) {
            const current = job.location as string;
            const enrichedLoc = enrichLocationWithState(current);

            if (enrichedLoc !== current) {
                const { error: updateErr } = await db
                    .from("jobs")
                    .update({ location: enrichedLoc })
                    .eq("id", job.id);

                if (!updateErr) {
                    enriched++;
                    console.log(`  Updated: "${current}" → "${enrichedLoc}"`);
                } else {
                    console.error(`  Failed to update job ${job.id}: ${updateErr.message}`);
                }
            } else {
                unchanged++;
            }
        }

        const summary = {
            success: true,
            total: jobs.length,
            enriched,
            unchanged,
        };

        console.log(`Done: ${JSON.stringify(summary)}`);

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

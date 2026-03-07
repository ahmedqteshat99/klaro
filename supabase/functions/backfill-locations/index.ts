import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { isLikelyInvalidLocation, normalizeJobLocation } from "../_shared/location-normalization.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    // Admin-only auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader) {
      console.error("No Authorization header provided");
      return new Response(JSON.stringify({ error: "Keine Authentifizierung. Bitte melden Sie sich an." }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Verify user is admin (use anon key with user's token for auth validation)
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: `Authentifizierungsfehler: ${userError.message}` }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (!userData?.user) {
      console.error("No user data returned");
      return new Response(JSON.stringify({ error: "Benutzer nicht gefunden. Bitte melden Sie sich erneut an." }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    console.log(`User authenticated: ${userData.user.id}`);

    const { data: roleData, error: roleError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (roleError) {
      console.error("Role fetch error:", roleError);
      return new Response(JSON.stringify({ error: `Rollenfehler: ${roleError.message}` }), {
        status: 500,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    if (roleData?.role !== "ADMIN") {
      console.error(`User role is ${roleData?.role}, not ADMIN`);
      return new Response(JSON.stringify({ error: "Nur Administratoren können diese Funktion verwenden." }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    console.log("Admin access granted");

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Get jobs with missing location plus RSS jobs that may still contain invalid location strings.
    const { data: missingJobs, error: missingErr } = await db
      .from("jobs")
      .select("id, title, hospital_name, description, apply_url, location, rss_feed_source")
      .or("location.is.null,location.eq.");

    if (missingErr) throw missingErr;

    const { data: rssJobs, error: rssErr } = await db
      .from("jobs")
      .select("id, title, hospital_name, description, apply_url, location, rss_feed_source")
      .not("rss_feed_source", "is", null);

    if (rssErr) throw rssErr;

    const jobs = new Map<string, {
      id: string;
      title: string | null;
      hospital_name: string | null;
      description: string | null;
      apply_url: string | null;
      location: string | null;
      rss_feed_source?: string | null;
    }>();

    for (const job of missingJobs ?? []) {
      jobs.set(job.id, job);
    }

    for (const job of rssJobs ?? []) {
      if (isLikelyInvalidLocation(job.location)) {
        jobs.set(job.id, job);
      }
    }

    const jobsToProcess = Array.from(jobs.values());

    if (jobsToProcess.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No jobs need location repair", total: 0, updated: 0, failed: 0 }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${jobsToProcess.length} jobs that need location repair`);

    let updated = 0;
    let failed = 0;
    const failures: string[] = [];

    for (const job of jobsToProcess) {
      try {
        const newLocation = normalizeJobLocation({
          rawLocation: job.location,
          hospitalName: job.hospital_name,
          title: job.title,
          description: job.description,
        });

        // Update if location was found
        if (newLocation && newLocation !== job.location) {
          const { error: updateErr } = await db
            .from("jobs")
            .update({ location: newLocation })
            .eq("id", job.id);

          if (updateErr) {
            console.error(`Failed to update job ${job.id}:`, updateErr);
            failures.push(`${job.id}: ${updateErr.message}`);
            failed++;
          } else {
            console.log(`✓ Updated job ${job.id}: "${newLocation}"`);
            updated++;
          }
        } else if (newLocation) {
          console.log(`• Location already normalized for job ${job.id}: "${newLocation}"`);
        } else {
          console.log(`✗ Could not extract location for job ${job.id}: ${job.title}`);
          failed++;
        }
      } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        failures.push(`${job.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: jobsToProcess.length,
        updated,
        failed,
        failures: failures.slice(0, 10), // Return first 10 failures
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

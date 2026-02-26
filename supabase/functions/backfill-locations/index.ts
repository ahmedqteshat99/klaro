import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enrichLocationWithState } from "../_shared/enrich-location.ts";

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

    // Get all jobs with missing location
    const { data: jobs, error: fetchErr } = await db
      .from("jobs")
      .select("id, title, hospital_name, description, apply_url, location")
      .or("location.is.null,location.eq.");

    if (fetchErr) throw fetchErr;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No jobs missing location", total: 0, updated: 0, failed: 0 }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${jobs.length} jobs with missing location`);

    let updated = 0;
    let failed = 0;
    const failures: string[] = [];

    // Medical terms that must never be treated as city names
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
    ]);

    for (const job of jobs) {
      try {
        let newLocation: string | null = null;

        // Strategy 1: Extract from hospital_name
        if (job.hospital_name) {
          const enriched = enrichLocationWithState(job.hospital_name);
          if (enriched.includes(',')) {
            newLocation = enriched;
            console.log(`Job ${job.id}: Extracted from hospital name "${job.hospital_name}" → "${enriched}"`);
          }
        }

        // Strategy 2: Extract PLZ+Stadt from title or description
        if (!newLocation) {
          const textToSearch = `${job.title || ''} ${job.description || ''}`;
          const plzMatch = textToSearch.match(/\b(\d{5})\s+([A-Za-zäöüÄÖÜß][A-Za-zäöüÄÖÜß\s\-]+)/);
          if (plzMatch) {
            const locationCandidate = `${plzMatch[1]} ${plzMatch[2].trim()}`;
            const enriched = enrichLocationWithState(locationCandidate);
            newLocation = enriched;
            console.log(`Job ${job.id}: Extracted PLZ from text "${locationCandidate}" → "${enriched}"`);
          }
        }

        // Strategy 3: Extract city name from description with common patterns
        if (!newLocation && job.description) {
          const cityPattern = /(?:in|Standort:|Location:|Ort:)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[a-zäöü]+)?)/;
          const cityMatch = job.description.match(cityPattern);
          if (cityMatch) {
            const candidate = cityMatch[1].trim();
            // Reject medical department names masquerading as cities
            if (!MEDICAL_TERMS.has(candidate.toLowerCase())) {
              const enriched = enrichLocationWithState(candidate);
              if (enriched.includes(',')) {
                newLocation = enriched;
                console.log(`Job ${job.id}: Extracted city pattern "${candidate}" → "${enriched}"`);
              }
            }
          }
        }

        // Strategy 4: Try just the first word of hospital name (e.g., "Berlin" from "Berlin Charité")
        if (!newLocation && job.hospital_name) {
          const firstWord = job.hospital_name.split(/[\s,]+/)[0];
          if (firstWord && firstWord.length >= 3) {
            const enriched = enrichLocationWithState(firstWord);
            if (enriched.includes(',')) {
              newLocation = enriched;
              console.log(`Job ${job.id}: Extracted first word "${firstWord}" → "${enriched}"`);
            }
          }
        }

        // Update if location was found
        if (newLocation) {
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
        total: jobs.length,
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

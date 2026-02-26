import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/** Extract node ID from Ärzteblatt URL.
 *  URL format: https://aerztestellen.aerzteblatt.de/de/stelle/assistenzarzt-m-w-d-innere-medizin-123456
 *  Or from rss_guid format */
function extractNodeIdFromUrl(url: string): string | null {
  // Try extracting from node-based URLs: /de/node/12345/...
  const nodeMatch = url.match(/\/node\/(\d+)/);
  if (nodeMatch) return nodeMatch[1];

  // Try extracting from detail page HTML if we have the job page
  return null;
}

/** Resolve Ärzteblatt employer URL from node ID by following redirects. */
async function resolveAerzteblattEmployerUrl(nodeId: string): Promise<{ url: string | null; error?: string }> {
  const applyUrl = `https://aerztestellen.aerzteblatt.de/de/node/${nodeId}/apply-external`;
  const skipDomains = ["aerzteblatt.de", "anzeigenvorschau.net"];
  const MAX_HOPS = 3;
  let currentUrl = applyUrl;

  // Helper to check if a URL's hostname contains any skip domain
  const isSkipDomain = (url: string): boolean => {
    try {
      const hostname = new URL(url).hostname;
      return skipDomains.some((d) => hostname.includes(d));
    } catch {
      return skipDomains.some((d) => url.includes(d)); // Fallback for invalid URLs
    }
  };

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    try {
      const resp = await fetch(currentUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
          "Accept": "text/html",
        },
        redirect: "manual",
        signal: AbortSignal.timeout(8_000),
      });

      console.log(`Hop ${hop}: ${resp.status} for ${currentUrl}`);

      const loc = resp.headers.get("Location");
      if (!loc) {
        // No more redirects - return if we're on an employer domain
        const finalUrl = currentUrl !== applyUrl && !isSkipDomain(currentUrl)
          ? currentUrl
          : null;
        return { url: finalUrl, error: finalUrl ? undefined : `No redirect found (status: ${resp.status})` };
      }

      const nextUrl = loc.startsWith("http") ? loc : new URL(loc, currentUrl).href;

      // If we've reached an employer domain, return it immediately
      if (!isSkipDomain(nextUrl)) {
        console.log(`✓ Found employer URL: ${nextUrl}`);
        return { url: nextUrl };
      }

      // Still on aggregator domain, follow the redirect
      currentUrl = nextUrl;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error resolving node ${nodeId}:`, error);
      return { url: null, error };
    }
  }

  // Max hops reached - check if we're on an employer domain
  const finalUrl = !isSkipDomain(currentUrl) ? currentUrl : null;
  return { url: finalUrl, error: finalUrl ? undefined : 'Max hops reached, still on aggregator domain' };
}

/** Extract node ID from Ärzteblatt detail page HTML. */
async function extractNodeIdFromJobPage(jobUrl: string): Promise<string | null> {
  try {
    const resp = await fetch(jobUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) return null;
    const html = await resp.text();

    // Look for article id="node-XXXXX" or /de/node/XXXXX/ patterns
    const articleMatch = html.match(/<article[^>]*id="node-(\d+)"/);
    if (articleMatch) return articleMatch[1];

    const applyLinkMatch = html.match(/href="\/de\/node\/(\d+)\/apply-external"/);
    if (applyLinkMatch) return applyLinkMatch[1];

    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const startTime = Date.now();
  const results = {
    total: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Admin-only auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { data: roleData, error: roleError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .single();

    if (roleError || roleData?.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    // Find all Ärzteblatt jobs that still link to aerzteblatt.de
    const { data: jobs, error: fetchErr } = await db
      .from("jobs")
      .select("id, title, apply_url, rss_guid")
      .eq("rss_feed_source", "aerzteblatt")
      .like("apply_url", "%aerzteblatt.de%")
      .not("rss_guid", "is", null)
      .limit(500); // Process in batches of 500

    if (fetchErr) throw fetchErr;
    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No jobs to backfill", ...results }),
        { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    results.total = jobs.length;
    console.log(`Found ${jobs.length} Ärzteblatt jobs needing URL backfill`);

    for (const job of jobs) {
      try {
        // Extract node ID from the rss_guid (job URL) or by fetching the page
        let nodeId = extractNodeIdFromUrl(job.rss_guid);

        if (!nodeId && job.rss_guid) {
          console.log(`Fetching node ID from job page: ${job.title}`);
          nodeId = await extractNodeIdFromJobPage(job.rss_guid);
        }

        if (!nodeId) {
          console.log(`✗ No node ID found for: ${job.title}`);
          results.skipped++;
          continue;
        }

        // Resolve the employer URL
        const { url: employerUrl, error: resolveError } = await resolveAerzteblattEmployerUrl(nodeId);

        if (!employerUrl) {
          console.log(`✗ Could not resolve employer URL for: ${job.title} - ${resolveError || 'Unknown reason'}`);
          results.failed++;
          results.errors.push(`${job.id}: ${resolveError || 'No employer URL found'}`);
          continue;
        }

        // Update the job
        const { error: updateErr } = await db
          .from("jobs")
          .update({
            apply_url: employerUrl,
            source_url: employerUrl,
          })
          .eq("id", job.id);

        if (updateErr) {
          console.error(`✗ Failed to update job ${job.id}:`, updateErr);
          results.failed++;
          results.errors.push(`${job.id}: ${updateErr.message}`);
        } else {
          console.log(`✓ Updated ${job.title}: ${employerUrl}`);
          results.updated++;
        }

        // Rate limiting: small delay between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error processing job ${job.id}:`, err);
        results.failed++;
        results.errors.push(`${job.id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Backfill complete in ${duration}s: ${results.updated} updated, ${results.failed} failed, ${results.skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        duration: `${duration}s`,
        ...results,
        errors: results.errors.slice(0, 10), // Return first 10 errors
      }),
      { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
        ...results,
      }),
      { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

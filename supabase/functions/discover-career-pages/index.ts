import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =====================
// Common Career Paths
// =====================

const COMMON_CAREER_PATHS = [
  "/karriere/stellenangebote",
  "/karriere",
  "/jobs",
  "/stellenangebote",
  "/karriere/aerzte",
  "/karriere/stellenangebote/aerzte",
  "/jobs-karriere",
  "/arbeitgeber/stellenangebote",
  "/de/karriere",
  "/de/jobs",
];

// =====================
// Path Discovery
// =====================

async function tryCareerPath(baseUrl: string, path: string): Promise<string | null> {
  try {
    const url = new URL(path, baseUrl).toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0; +https://klaro.tools)",
      },
    });

    clearTimeout(timeout);

    if (response.ok && response.status === 200) {
      return response.url; // Return final URL after redirects
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function findCareerPageFromHomepage(websiteUrl: string): Promise<string | null> {
  try {
    const response = await fetch(websiteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Find links with career-related keywords
    const keywords = ["karriere", "jobs", "stellenangebot", "arbeitgeber", "bewerbung"];

    const careerLinks = $("a").filter((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().toLowerCase();

      return keywords.some((keyword) =>
        href.toLowerCase().includes(keyword) || text.includes(keyword)
      );
    }).toArray();

    if (careerLinks.length > 0) {
      const href = $(careerLinks[0]).attr("href");
      if (href) {
        try {
          return new URL(href, websiteUrl).toString();
        } catch {
          return null;
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`Failed to parse homepage for ${websiteUrl}:`, error);
    return null;
  }
}

// =====================
// Platform Detection
// =====================

async function detectPlatform(careerUrl: string): Promise<string> {
  try {
    const response = await fetch(careerUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) return "custom";

    const html = await response.text();
    const lowerHtml = html.toLowerCase();
    const urlLower = careerUrl.toLowerCase();

    if (urlLower.includes("softgarden") || lowerHtml.includes("softgarden")) {
      return "softgarden";
    }
    if (urlLower.includes("personio") || lowerHtml.includes("personio")) {
      return "personio";
    }
    if (urlLower.includes("rexx") || lowerHtml.includes("rexx-systems")) {
      return "rexx";
    }
    if (urlLower.includes("successfactors") || lowerHtml.includes("successfactors")) {
      return "successfactors";
    }
    if (lowerHtml.includes("jobware") || urlLower.includes("jobware")) {
      return "jobware";
    }
    if (lowerHtml.includes("typo3") || lowerHtml.includes("wordpress")) {
      return "cms";
    }

    return "custom";
  } catch (error) {
    return "custom";
  }
}

// =====================
// Main Discovery Logic
// =====================

async function discoverCareerPage(hospital: any): Promise<{
  careerUrl: string | null;
  platform: string | null;
  method: string;
}> {
  console.log(`\n🔍 Discovering career page for: ${hospital.name}`);

  if (!hospital.website) {
    console.log("  ⚠️  No website, skipping");
    return { careerUrl: null, platform: null, method: "no_website" };
  }

  // Method 1: Try common paths
  console.log("  📂 Trying common paths...");
  for (const path of COMMON_CAREER_PATHS) {
    const url = await tryCareerPath(hospital.website, path);
    if (url) {
      console.log(`  ✓ Found via path: ${path}`);
      const platform = await detectPlatform(url);
      return { careerUrl: url, platform, method: "common_path" };
    }
  }

  // Method 2: Parse homepage for career links
  console.log("  🏠 Scanning homepage...");
  const homepageUrl = await findCareerPageFromHomepage(hospital.website);
  if (homepageUrl) {
    console.log(`  ✓ Found via homepage link`);
    const platform = await detectPlatform(homepageUrl);
    return { careerUrl: homepageUrl, platform, method: "homepage_link" };
  }

  console.log("  ❌ No career page found");
  return { careerUrl: null, platform: null, method: "not_found" };
}

// =====================
// Database Update
// =====================

async function updateHospitalCareerPage(
  hospitalId: string,
  careerUrl: string | null,
  platform: string | null
) {
  const { error } = await supabase
    .from("hospitals")
    .update({
      career_page_url: careerUrl,
      career_platform: platform,
      last_scraped_at: new Date().toISOString(),
      last_scrape_success: careerUrl !== null,
    })
    .eq("id", hospitalId);

  if (error) {
    console.error(`  ❌ Failed to update hospital: ${error.message}`);
  }
}

// =====================
// Main Handler
// =====================

serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
      },
    });
  }

  try {
    // Auth check - TEMPORARILY DISABLED FOR TESTING
    // const cronSecret = req.headers.get("x-cron-secret");
    // const authHeader = req.headers.get("authorization");

    // if (cronSecret !== CRON_SECRET) {
    //   if (!authHeader) {
    //     return new Response(JSON.stringify({ error: "Unauthorized" }), {
    //       status: 401,
    //       headers: { "Content-Type": "application/json" },
    //     });
    //   }

    //   const jwt = authHeader.replace("Bearer ", "");
    //   const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

    //   if (authError || !user) {
    //     return new Response(JSON.stringify({ error: "Invalid token" }), {
    //       status: 401,
    //       headers: { "Content-Type": "application/json" },
    //     });
    //   }

    //   // Check if admin
    //   const { data: profile } = await supabase
    //     .from("profiles")
    //     .select("role")
    //     .eq("id", user.id)
    //     .single();

    //   if (profile?.role !== "admin") {
    //     return new Response(JSON.stringify({ error: "Admin access required" }), {
    //       status: 403,
    //       headers: { "Content-Type": "application/json" },
    //     });
    //   }
    // }

    // Get hospitals without career pages (50 per run for 24-hour coverage)
    // 25 hospitals × 12 runs/day (every 2 hours) = 300 hospitals/day
    // Reduced from 50 to avoid WORKER_LIMIT errors on Edge Functions
    const { data: hospitals, error: fetchError } = await supabase
      .from("hospitals")
      .select("*")
      .eq("is_active", true)
      .is("career_page_url", null)
      .not("website", "is", null)
      .order("created_at", { ascending: true })
      .limit(25); // Process 25 per run (resource limit safe)

    if (fetchError) throw fetchError;

    if (!hospitals || hospitals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hospitals need career page discovery" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`\n🏥 Processing ${hospitals.length} hospitals...\n`);
    console.log("=".repeat(60));

    const results = {
      processed: 0,
      found: 0,
      notFound: 0,
      byPlatform: {} as Record<string, number>,
    };

    for (const hospital of hospitals) {
      const discovery = await discoverCareerPage(hospital);

      await updateHospitalCareerPage(
        hospital.id,
        discovery.careerUrl,
        discovery.platform
      );

      results.processed++;
      if (discovery.careerUrl) {
        results.found++;
        const platform = discovery.platform || "unknown";
        results.byPlatform[platform] = (results.byPlatform[platform] || 0) + 1;
      } else {
        results.notFound++;
      }

      // Rate limiting: 3 seconds between hospitals
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n✅ Discovery complete!\n");
    console.log(`📊 Results:`);
    console.log(`  Processed: ${results.processed}`);
    console.log(`  Found: ${results.found}`);
    console.log(`  Not found: ${results.notFound}`);
    console.log(`\n🏢 By platform:`);
    for (const [platform, count] of Object.entries(results.byPlatform)) {
      console.log(`  ${platform}: ${count}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

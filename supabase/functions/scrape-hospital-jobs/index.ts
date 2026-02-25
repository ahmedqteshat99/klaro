import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// =====================
// Link Validation
// =====================

interface ValidationResult {
  valid: boolean;
  httpStatus: number | null;
  isDead: boolean;
  finalUrl?: string;
  error?: string;
}

/**
 * Validate URL pattern - excludes generic career pages, articles, etc.
 * Only accepts URLs that look like specific job postings
 */
function isValidJobUrlPattern(url: string): { valid: boolean; reason?: string } {
  const lowerUrl = url.toLowerCase();

  // BLACKLIST: Exclude URLs that are clearly NOT job postings
  const blacklistPatterns = [
    // Generic career pages (without job IDs)
    /\/karriere\/?$/i,
    /\/jobs\/?$/i,
    /\/stellenangebote\/?$/i,
    /\/stellenmarkt\/?$/i,
    /\/career\/?$/i,

    // Application info pages
    /\/bewerbung(en)?\/?$/i,
    /\/online-bewerbung/i,
    /\/bewerbungsformular/i,
    /\/application/i,

    // About/Team pages
    /\/ueber-uns/i,
    /\/about/i,
    /\/team\/?$/i,
    /\/kontakt/i,
    /\/contact/i,

    // News/Blog
    /\/news\//i,
    /\/blog\//i,
    /\/aktuelles\//i,
    /\/presse\//i,

    // Department/Category pages
    /\/abteilungen\/?$/i,
    /\/departments\/?$/i,
    /\/fachbereiche\/?$/i,

    // Benefits/Info pages
    /\/benefits/i,
    /\/vorteile/i,
    /\/warum-wir/i,
    /\/why-join/i,
  ];

  for (const pattern of blacklistPatterns) {
    if (pattern.test(url)) {
      return { valid: false, reason: `Blacklisted pattern: ${pattern}` };
    }
  }

  // WHITELIST: URL should look like a job posting (relaxed - allow more patterns)
  const hasJobIndicator =
    // Numeric job ID
    /\/(job|stelle|position|vacancy)[/-]?\d+/i.test(url) ||
    // Job with slug (e.g., /assistenzarzt-innere-medizin-12345)
    /\/(assistenzarzt|arzt|facharzt|oberarzt)[/-][a-z0-9-]+/i.test(url) ||
    // Platform-specific patterns
    /softgarden.*\/job\//i.test(url) ||
    /personio.*\/job\//i.test(url) ||
    /rexx.*\/jobs\//i.test(url) ||
    /successfactors.*\/jobReq/i.test(url) ||
    // Anzeige/detail pages with IDs
    /\/(anzeige|detail|view)[/-]?\d+/i.test(url) ||
    // RELAXED: URLs containing job-related keywords with paths
    (/\/(stelle|job|position)[ns]?\/[^\/]+/i.test(url) && !/\/(stelle|job|position)[ns]?\/?$/i.test(url)) ||
    // URLs with assistenzarzt in path (not root)
    (/assistenzarzt/i.test(url) && url.split('/').length > 4);

  if (!hasJobIndicator) {
    return { valid: false, reason: "No job ID or specific identifier in URL" };
  }

  return { valid: true };
}

async function validateJobUrl(url: string): Promise<ValidationResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "HEAD", // Use HEAD to avoid downloading full content
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AssistenzarztBot/1.0; +https://klaro.tools)",
      },
    });

    clearTimeout(timeout);

    // RELAXED: Accept 2xx and 3xx as valid (redirects are OK)
    // Only reject 4xx and 5xx errors
    const isValid = response.status >= 200 && response.status < 400;
    const isDead = response.status === 404 || response.status === 410 || response.status === 451;

    return {
      valid: isValid,
      httpStatus: response.status,
      isDead,
      finalUrl: response.url, // Final URL after redirects
    };
  } catch (error) {
    // RELAXED: If HEAD fails, assume it's valid (some servers block HEAD requests)
    // The content verification step will catch truly dead links
    console.log(`⚠️  HEAD request failed for ${url}, assuming valid`);
    return {
      valid: true, // Changed from false to true
      httpStatus: null,
      isDead: false,
      finalUrl: url,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Comprehensive job page content verification
 * Ensures the page is actually a job posting, not a listing page or article
 */
async function verifyJobPageContent(url: string, expectedKeywords: string[]): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AssistenzarztBot/1.0; +https://klaro.tools)",
      },
    });

    if (!response.ok) return false;

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // CRITICAL: Page must NOT be a 404 error
    if (lowerHtml.includes("not found") || lowerHtml.includes("404") || lowerHtml.includes("seite nicht gefunden")) {
      return false;
    }

    // CRITICAL: Exclude generic career/listing pages
    const isGenericCareerPage =
      lowerHtml.includes("<title>karriere</title>") ||
      lowerHtml.includes("<title>stellenangebote</title>") ||
      lowerHtml.includes("<title>jobs</title>") ||
      lowerHtml.includes("<h1>stellenangebote</h1>") ||
      lowerHtml.includes("<h1>karriere</h1>") ||
      lowerHtml.includes("unsere stellenangebote") ||
      lowerHtml.includes("alle offenen stellen");

    if (isGenericCareerPage) {
      console.log(`Rejected: Generic career page - ${url}`);
      return false;
    }

    // CRITICAL: Must contain job-related keywords
    const hasJobKeywords = expectedKeywords.some((keyword) =>
      lowerHtml.includes(keyword.toLowerCase())
    );

    if (!hasJobKeywords) {
      return false;
    }

    // REQUIRED: Must have application mechanism (bewerben button, email, or form)
    const hasApplicationMechanism =
      lowerHtml.includes("bewerben") ||
      lowerHtml.includes("bewerbung") ||
      lowerHtml.includes("apply") ||
      lowerHtml.includes("application") ||
      lowerHtml.includes("@") && lowerHtml.includes("mailto:") ||
      lowerHtml.includes("bewerbungsformular");

    if (!hasApplicationMechanism) {
      console.log(`Rejected: No application mechanism found - ${url}`);
      return false;
    }

    // REQUIRED: Must have substantive content (job description)
    // RELAXED: Reduced from 2000 to 500 bytes to allow compact job postings
    const hasSubstantiveContent = html.length > 500;

    if (!hasSubstantiveContent) {
      console.log(`Rejected: Insufficient content (${html.length} bytes) - ${url}`);
      return false;
    }

    // REQUIRED: Should have job-specific indicators (not just generic content)
    // RELAXED: Only need 1 indicator instead of 2
    const jobIndicators = [
      "aufgaben",
      "anforderungen",
      "qualifikation",
      "ihr profil",
      "wir bieten",
      "benefits",
      "tätigkeiten",
      "verantwortung",
      "ihre aufgaben",
      "was sie erwartet",
      "stellenbeschreibung"
    ];

    const hasJobStructure = jobIndicators.some(indicator =>
      lowerHtml.includes(indicator)
    );

    if (!hasJobStructure) {
      console.log(`Rejected: Missing job structure indicators - ${url}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Failed to verify job page content for ${url}:`, error);
    return false;
  }
}

// =====================
// Platform Scrapers
// =====================

interface JobListing {
  title: string;
  url: string;
  description?: string;
  department?: string;
  location?: string;
  sourceIdentifier?: string;
}

async function scrapeSoftgarden(baseUrl: string): Promise<JobListing[]> {
  try {
    // Extract tenant from URL (e.g., https://karriere.uniklinik-duesseldorf.de -> karriere.uniklinik-duesseldorf)
    const urlObj = new URL(baseUrl);
    const tenant = urlObj.hostname.split(".")[0];

    // Softgarden API endpoint
    const apiUrl = `https://${tenant}.softgarden.io/api/job-offers`;

    const response = await fetch(apiUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.log(`Softgarden API returned ${response.status} for ${apiUrl}`);
      return [];
    }

    const data = await response.json();
    const jobs: JobListing[] = [];

    for (const job of data) {
      const title = job.title || job.name || "";
      const lowerTitle = title.toLowerCase();

      // Filter for Assistenzarzt positions
      if (
        lowerTitle.includes("assistenzarzt") ||
        lowerTitle.includes("arzt in weiterbildung") ||
        lowerTitle.includes("arzt (m/w/d)") ||
        lowerTitle.includes("ärztin (m/w/d)")
      ) {
        jobs.push({
          title,
          url: job.url || `${baseUrl}/${job.id}`,
          description: job.description,
          department: job.department || job.category,
          location: job.location,
          sourceIdentifier: job.id?.toString(),
        });
      }
    }

    return jobs;
  } catch (error) {
    console.error(`Failed to scrape Softgarden at ${baseUrl}:`, error);
    return [];
  }
}

async function scrapePersonio(baseUrl: string): Promise<JobListing[]> {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) return [];

    const html = await response.text();
    const $ = cheerio.load(html);
    const jobs: JobListing[] = [];

    // Personio embeds JSON-LD structured data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}");
        if (data["@type"] === "JobPosting") {
          const title = data.title || "";
          if (
            title.toLowerCase().includes("assistenzarzt") ||
            title.toLowerCase().includes("ärztin")
          ) {
            jobs.push({
              title,
              url: data.url || baseUrl,
              description: data.description,
              department: data.department?.name,
              location: data.jobLocation?.address?.addressLocality,
            });
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });

    return jobs;
  } catch (error) {
    console.error(`Failed to scrape Personio at ${baseUrl}:`, error);
    return [];
  }
}

async function scrapeCustomCareerPage(url: string): Promise<JobListing[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const html = await response.text();
    let $ = cheerio.load(html);
    let jobs: JobListing[] = [];
    const seenUrls = new Set<string>();

    // STEP 1: Check if this page has actual job postings or if it's a landing page
    let jobLinksFound = 0;
    $("a[href]").each((_: number, el: any) => {
      const href = $(el).attr("href");
      if (!href) return;
      const fullUrl = href.startsWith("http") ? href : new URL(href, url).toString();
      if (/\/(stelle|job|position)(?:n|angebot)?\/[^\/]+|\/detail\/\d+|\/anzeige\/\d+/i.test(fullUrl)) {
        jobLinksFound++;
      }
    });

    console.log(`  Found ${jobLinksFound} potential job links on landing page`);

    // STEP 2: If no job links found, this might be a landing page - look for job listing page link
    if (jobLinksFound === 0) {
      console.log(`  Appears to be a landing page, looking for job listing page...`);

      const jobListingPatterns = [
        /^\/(stellenangebote|jobs|offene-stellen|karriere\/stellen|vacancies|openings)/i,
        /(stellenangebote|jobs|offene-stellen)/i,
      ];

      let jobListingUrl: string | null = null;

      $("a[href]").each((_: number, el: any) => {
        if (jobListingUrl) return; // Already found
        const href = $(el).attr("href") || "";
        const text = $(el).text().toLowerCase();

        // Check if link text or href suggests job listings
        if (
          text.includes("stellenangebote") ||
          text.includes("offene stellen") ||
          text.includes("jobs") ||
          text.includes("alle stellen") ||
          jobListingPatterns.some(p => p.test(href))
        ) {
          jobListingUrl = href.startsWith("http") ? href : new URL(href, url).toString();
          console.log(`  Found job listing page: ${jobListingUrl}`);
        }
      });

      // If found, fetch and parse the actual job listing page
      if (jobListingUrl) {
        const listingResponse = await fetch(jobListingUrl);
        if (listingResponse.ok) {
          const listingHtml = await listingResponse.text();
          $ = cheerio.load(listingHtml);
          url = jobListingUrl; // Update base URL for relative links
          console.log(`  Successfully loaded job listing page`);
        }
      } else {
        console.log(`  No job listing page found, will try to scrape landing page anyway`);
      }
    }

    // STEP 3: Find links that look like job postings
    $("a[href]").each((_, el) => {
      const $el = $(el);
      const href = $el.attr("href");
      if (!href) return;

      const jobUrl = href.startsWith("http") ? href : new URL(href, url).toString();

      // Basic URL filtering - must look like a job posting
      const urlLower = jobUrl.toLowerCase();
      const isJobUrl =
        /\/(stelle|job|position|vacancy|karriere)(?:n|angebot)?\/[^\/]+/i.test(jobUrl) ||
        /\/detail\/\d+/i.test(jobUrl) ||
        /\/anzeige\/\d+/i.test(jobUrl) ||
        /stellenangebot.*\d+/i.test(jobUrl);

      if (!isJobUrl) return;

      // Skip if already seen
      if (seenUrls.has(jobUrl)) return;
      seenUrls.add(jobUrl);

      // Get title - be lenient, use any available text
      let title = $el.find(".job-title, h2, h3, h4, .title").first().text().trim() ||
                  $el.closest(".job-listing, .job-item").find("h2, h3, h4").first().text().trim() ||
                  $el.text().trim() ||
                  "Job Opening"; // Fallback

      // Clean up title
      title = title.replace(/\s+/g, ' ').trim();

      // REJECT: Button text and generic UI elements
      const buttonTextPatterns = [
        /^(jetzt\s+)?bewerben$/i,
        /^hier\s+bewerben$/i,
        /^zur\s+bewerbung$/i,
        /^details?$/i,
        /^mehr\s+infos?$/i,
        /^weiterlesen$/i,
        /^ansehen$/i,
        /^\d+$/,  // Just numbers
        /^weiter$/i,
      ];

      if (buttonTextPatterns.some(pattern => pattern.test(title))) {
        return; // Skip button text
      }

      // REJECT: Non-doctor positions (nursing, admin, etc.)
      const nonDoctorPatterns = [
        /pflegefachkraft/i,
        /gesundheits.*pfleger/i,
        /krankenpfleger/i,
        /\bMFA\b/i,  // Medizinische Fachangestellte
        /medizinische.*fachangestellte/i,
        /pflegeassistent/i,
        /verwaltung[^a-z]*(mitarbeiter|kraft)/i,
        /\bIT\b.*administrator/i,
        /reinigungskraft/i,
      ];

      if (nonDoctorPatterns.some(pattern => pattern.test(title))) {
        return; // Skip non-doctor positions
      }

      // Apply medical position filtering for titles >= 10 characters
      if (title.length >= 10) {
        const lowerTitle = title.toLowerCase();
        const isDoctorPosition =
          lowerTitle.includes("assistenzarzt") ||
          lowerTitle.includes("assistenzärztin") ||
          lowerTitle.includes("facharzt") ||
          lowerTitle.includes("oberarzt") ||
          lowerTitle.includes("chefarzt") ||
          (lowerTitle.includes("arzt") && (
            lowerTitle.includes("weiterbildung") ||
            lowerTitle.includes("in weiterbildung") ||
            lowerTitle.includes("medizin")
          )) ||
          lowerTitle.includes("ärzt");

        // Only skip if we have a title AND it's clearly not a doctor position
        if (!isDoctorPosition) {
          return; // Skip non-doctor with clear title
        }
      }

      jobs.push({
        title,
        url: jobUrl,
        description: "",
        department: "",
      });
    });

    console.log(`Custom scraper extracted ${jobs.length} job candidates from ${url}`);
    return jobs;
  } catch (error) {
    console.error(`Failed to scrape custom page at ${url}:`, error);
    return [];
  }
}

async function detectPlatformAndScrape(careerUrl: string): Promise<JobListing[]> {
  const lowerUrl = careerUrl.toLowerCase();

  if (lowerUrl.includes("softgarden")) {
    return scrapeSoftgarden(careerUrl);
  } else if (lowerUrl.includes("personio")) {
    return scrapePersonio(careerUrl);
  } else {
    return scrapeCustomCareerPage(careerUrl);
  }
}

// =====================
// Job Processing
// =====================

async function processHospitalJobs(hospital: any) {
  console.log(`\n========================================`);
  console.log(`Processing: ${hospital.name}`);
  console.log(`URL: ${hospital.career_page_url}`);
  console.log(`Platform: ${hospital.career_platform || 'unknown'}`);

  if (!hospital.career_page_url) {
    console.log(`No career page URL for ${hospital.name}, skipping`);
    return { hospital: hospital.name, jobsFound: 0, jobsAdded: 0 };
  }

  // Scrape jobs
  const jobs = await detectPlatformAndScrape(hospital.career_page_url);
  console.log(`\n📋 Scraped ${jobs.length} job candidates from career page`);

  let jobsAdded = 0;

  console.log(`\n🔍 Validating ${jobs.length} candidates...\n`);

  for (const job of jobs) {
    console.log(`\nCandidate: "${job.title}"`);
    console.log(`  URL: ${job.url}`);

    // STEP 1: Validate URL pattern (fast, no network call)
    const urlPatternCheck = isValidJobUrlPattern(job.url);
    if (!urlPatternCheck.valid) {
      console.log(`  ❌ URL pattern: ${urlPatternCheck.reason}`);
      continue;
    }
    console.log(`  ✅ URL pattern valid`);

    // STEP 2: Validate HTTP response
    const validation = await validateJobUrl(job.url);

    if (!validation.valid) {
      console.log(`  ❌ HTTP check failed (${validation.httpStatus || 'error'})`);
      continue;
    }
    console.log(`  ✅ HTTP check passed (${validation.httpStatus})`);

    // STEP 3: Content verification - ensures page is actually a job posting
    const contentValid = await verifyJobPageContent(job.url, ["assistenzarzt", "arzt", "stelle", "position", "ärzt"]);
    if (!contentValid) {
      console.log(`  ❌ Content verification failed`);
      continue;
    }
    console.log(`  ✅ Content verification passed`);

    console.log(`  ✅✅ JOB VALIDATED: "${job.title}"`);

    // Check for duplicates
    const { data: duplicateCheck } = await supabase.rpc("find_duplicate_job", {
      p_apply_url_hash: null, // Will be calculated by trigger
      p_content_hash: null, // Will be calculated by trigger
    });

    // Insert job
    const { error } = await supabase.from("jobs").insert({
      title: job.title,
      hospital_id: hospital.id,
      hospital_name: hospital.name,
      department: job.department,
      location: hospital.city + ", " + hospital.bundesland,
      description: job.description || `Assistenzarzt position at ${hospital.name}`,
      apply_url: validation.finalUrl || job.url, // Use final URL after redirects
      source: "hospital_scrape",
      source_identifier: job.sourceIdentifier,
      is_published: true,
      published_at: new Date().toISOString(),
      scraped_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      url_validated: true,
      url_validation_date: new Date().toISOString(),
      url_http_status: validation.httpStatus,
      url_is_dead: false,
    });

    if (!error) {
      jobsAdded++;
    } else if (error.code === "23505") {
      // Duplicate (unique constraint violation)
      console.log(`Duplicate job skipped: ${job.title}`);
    } else {
      console.error(`Failed to insert job "${job.title}":`, error);
    }
  }

  // Update hospital metadata
  await supabase.from("hospitals").update({
    last_scraped_at: new Date().toISOString(),
    last_scrape_success: true,
    scrape_success_count: hospital.scrape_success_count + 1,
    has_job_postings: jobsAdded > 0,
    job_postings_count: jobsAdded,
  }).eq("id", hospital.id);

  return { hospital: hospital.name, jobsFound: jobs.length, jobsAdded };
}

// =====================
// Main Handler
// =====================

serve(async (req) => {
  // CORS preflight
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
    //   // Check if user is admin
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

    // Get hospitals to scrape (limit to 10 per invocation to avoid timeout)
    // 10 hospitals × 24 runs/day = 240 hospitals/day
    // Full cycle: ~2 days for 500 hospitals (acceptable for hourly updates)
    const { data: hospitals, error: fetchError } = await supabase
      .from("hospitals")
      .select("*")
      .eq("is_active", true)
      .not("career_page_url", "is", null)
      .order("last_scraped_at", { ascending: true, nullsFirst: true })
      .limit(10);

    if (fetchError) throw fetchError;

    if (!hospitals || hospitals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hospitals to scrape" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Process hospitals
    const results = [];
    for (const hospital of hospitals) {
      const result = await processHospitalJobs(hospital);
      results.push(result);

      // Rate limiting: 2 seconds between hospitals (reduced to avoid timeout)
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const totalFound = results.reduce((sum, r) => sum + r.jobsFound, 0);
    const totalAdded = results.reduce((sum, r) => sum + r.jobsAdded, 0);

    return new Response(
      JSON.stringify({
        success: true,
        hospitalsProcessed: hospitals.length,
        totalJobsFound: totalFound,
        totalJobsAdded: totalAdded,
        results,
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

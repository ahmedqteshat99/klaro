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

    const isValid = response.status >= 200 && response.status < 400;
    const isDead = response.status === 404 || response.status === 410;

    return {
      valid: isValid,
      httpStatus: response.status,
      isDead,
      finalUrl: response.url, // Final URL after redirects
    };
  } catch (error) {
    console.error(`Failed to validate URL ${url}:`, error);
    return {
      valid: false,
      httpStatus: null,
      isDead: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

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

    // Check if page contains job-related keywords
    const hasKeywords = expectedKeywords.some((keyword) =>
      lowerHtml.includes(keyword.toLowerCase())
    );

    // Additional check: page should NOT be a 404 error page
    const is404Page = lowerHtml.includes("not found") || lowerHtml.includes("404");

    return hasKeywords && !is404Page;
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
    const $ = cheerio.load(html);
    const jobs: JobListing[] = [];

    // Common selectors for job listings
    const selectors = [
      ".job-listing",
      ".job-item",
      ".job-row",
      "tr.job",
      "div[class*='job']",
      "a[href*='stellenangebot']",
      "a[href*='job']",
    ];

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const $el = $(el);
        const titleEl = $el.find(".job-title, h2, h3, strong, b").first();
        const linkEl = $el.is("a") ? $el : $el.find("a[href]").first();

        const title = titleEl.text().trim() || $el.text().trim();
        const href = linkEl.attr("href");

        if (!title || !href) return;

        const lowerTitle = title.toLowerCase();
        if (
          lowerTitle.includes("assistenzarzt") ||
          lowerTitle.includes("ärzt") ||
          lowerTitle.includes("weiterbildung")
        ) {
          // Resolve relative URLs
          const jobUrl = href.startsWith("http") ? href : new URL(href, url).toString();

          jobs.push({
            title,
            url: jobUrl,
            description: $el.find(".description, .job-description, p").first().text().trim(),
          });
        }
      });

      if (jobs.length > 0) break; // Found jobs with this selector, stop trying others
    }

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
  console.log(`Processing hospital: ${hospital.name}`);

  if (!hospital.career_page_url) {
    console.log(`No career page URL for ${hospital.name}, skipping`);
    return { hospital: hospital.name, jobsFound: 0, jobsAdded: 0 };
  }

  // Scrape jobs
  const jobs = await detectPlatformAndScrape(hospital.career_page_url);
  console.log(`Found ${jobs.length} potential Assistenzarzt jobs at ${hospital.name}`);

  let jobsAdded = 0;

  for (const job of jobs) {
    // Validate URL
    const validation = await validateJobUrl(job.url);

    if (!validation.valid) {
      console.log(`Invalid URL for job "${job.title}": ${job.url} (${validation.error})`);
      continue;
    }

    // Verify page content
    const contentValid = await verifyJobPageContent(job.url, ["assistenzarzt", "arzt", "stelle"]);

    if (!contentValid) {
      console.log(`Job page content invalid for: ${job.url}`);
      continue;
    }

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
    // Auth check
    const cronSecret = req.headers.get("x-cron-secret");
    const authHeader = req.headers.get("authorization");

    if (cronSecret !== CRON_SECRET) {
      // Check if user is admin
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);

      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Get hospitals to scrape (limit to 10 per invocation)
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

      // Rate limiting: 5 seconds between hospitals
      await new Promise((resolve) => setTimeout(resolve, 5000));
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

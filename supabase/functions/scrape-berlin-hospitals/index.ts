import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ───────────────────────────────────────────────
const HOSPITALS_PER_RUN = 5;
const MAX_EXECUTION_MS = 140_000; // 140s (10s buffer before 150s timeout)
const MISS_THRESHOLD = 2; // Mark job as "gone" after 2 consecutive misses

// Career URL discovery patterns
const CAREER_SUBDOMAINS = ["karriere", "jobs", "stellenangebote", "career", "careers"];
const CAREER_PATHS = [
    "/karriere", "/stellenangebote", "/jobs", "/career", "/careers",
    "/de/karriere", "/de/jobs", "/de/stellenangebote",
    "/karriere/stellenangebote", "/karriere/jobs",
    "/ueber-uns/karriere", "/arbeiten-bei-uns",
];

// ─── Helpers ─────────────────────────────────────────────────────

function generateRunId(): string {
    return `berlin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Extract the registerable domain from a URL (e.g. vivantes.de from https://www.vivantes.de/foo). */
function extractBaseDomain(url: string): string | null {
    try {
        const parsed = new URL(url);
        const parts = parsed.hostname.split(".");
        // Handle co.uk style TLDs
        if (parts.length >= 2) {
            return parts.slice(-2).join(".");
        }
        return parsed.hostname;
    } catch {
        return null;
    }
}

/** Try fetching a URL and return true if it responds with 200. */
async function probeUrl(url: string): Promise<boolean> {
    try {
        const resp = await fetch(url, {
            method: "HEAD",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(8_000),
        });
        return resp.status >= 200 && resp.status < 400;
    } catch {
        return false;
    }
}

/** Discover the hospital's career page URL by probing subdomains and paths. */
async function discoverCareerUrl(websiteUrl: string): Promise<string | null> {
    const baseDomain = extractBaseDomain(websiteUrl);
    if (!baseDomain) return null;

    // 1. Try subdomains first (karriere.vivantes.de, jobs.charite.de, etc.)
    for (const sub of CAREER_SUBDOMAINS) {
        const subdomainUrl = `https://${sub}.${baseDomain}`;
        console.log(`  Probing subdomain: ${subdomainUrl}`);
        if (await probeUrl(subdomainUrl)) {
            console.log(`  ✓ Found career subdomain: ${subdomainUrl}`);
            return subdomainUrl;
        }
    }

    // 2. Try common paths on the main domain
    const baseUrl = websiteUrl.replace(/\/+$/, "");
    for (const path of CAREER_PATHS) {
        const pathUrl = `${baseUrl}${path}`;
        console.log(`  Probing path: ${pathUrl}`);
        if (await probeUrl(pathUrl)) {
            console.log(`  ✓ Found career path: ${pathUrl}`);
            return pathUrl;
        }
    }

    return null;
}

/** Resolve the actual hospital website from the DKV profile page. */
async function resolveWebsiteFromDkv(dkvUrl: string): Promise<string | null> {
    try {
        const resp = await fetch(dkvUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
                "Accept": "text/html",
            },
            signal: AbortSignal.timeout(10_000),
        });
        if (!resp.ok) return null;
        const html = await resp.text();

        // DKV pages have the hospital website in a link with "Homepage" or "Webseite" text
        // or in a direct external link pattern
        const websitePatterns = [
            /href="(https?:\/\/(?!.*deutsches-krankenhaus-verzeichnis)[^"]+)"[^>]*>\s*(?:Homepage|Webseite|Website|Internetseite)/i,
            /(?:Homepage|Webseite|Website)[\s\S]*?href="(https?:\/\/(?!.*deutsches-krankenhaus-verzeichnis)[^"]+)"/i,
            // Fallback: look for external links in the contact section
            /class="[^"]*website[^"]*"[^>]*href="(https?:\/\/[^"]+)"/i,
            /href="(https?:\/\/(?!.*deutsches-krankenhaus-verzeichnis|.*google|.*facebook|.*twitter)[^"]+)"[^>]*rel="noopener/i,
        ];

        for (const pattern of websitePatterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
                const url = match[1].replace(/\/+$/, "");
                console.log(`  Resolved website: ${url}`);
                return url;
            }
        }

        return null;
    } catch {
        return null;
    }
}

interface ExtractedJob {
    title: string;
    url: string | null;
    department: string | null;
}

/** Use Claude Haiku to extract Assistenzarzt / Innere Medizin jobs from career page HTML. */
async function extractJobsWithAi(
    html: string,
    hospitalName: string,
    careerUrl: string,
    anthropicKey: string
): Promise<ExtractedJob[]> {
    // Truncate HTML to ~30k chars to stay within token limits
    const truncatedHtml = html.length > 30_000 ? html.substring(0, 30_000) : html;

    const prompt = `Du analysierst die Karriere-/Stellenangebote-Seite des Krankenhauses "${hospitalName}" (URL: ${careerUrl}).

Extrahiere ALLE Stellenangebote die für Assistenzärzte oder Ärzte in Weiterbildung relevant sind.
Suche speziell nach:
- Assistenzarzt / Assistenzärztin Positionen
- Arzt/Ärztin in Weiterbildung  
- Positionen in Innere Medizin, Kardiologie, Gastroenterologie, Nephrologie, Pneumologie, Hämatologie/Onkologie, Endokrinologie, Rheumatologie, Geriatrie (und verwandte Subdisziplinen der Inneren Medizin)
- Positionen die "Assistenzarzt" ODER "Innere Medizin" im Titel enthalten

Antworte NUR mit einem validen JSON-Array. Für jede gefundene Stelle:
[
  {
    "title": "Voller Stellentitel",
    "url": "Vollständige Bewerbungs-URL (absolut, nicht relativ) oder null",
    "department": "Fachbereich/Abteilung oder null"
  }
]

Wenn KEINE relevanten Stellen gefunden werden, antworte mit: []

WICHTIG: 
- Gib NUR valides JSON zurück, kein Markdown, keine Erklärungen
- Mache relative URLs absolut basierend auf ${careerUrl}
- Inkludiere nur Stellen die wirklich Assistenzarzt/Weiterbildung oder Innere Medizin betreffen`;

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 2000,
                system: "Du extrahierst Stellenangebote aus deutschen Krankenhaus-Karriereseiten. Antworte NUR mit validem JSON.",
                messages: [{
                    role: "user",
                    content: `${prompt}\n\nHTML-Inhalt der Karriereseite:\n\n${truncatedHtml}`,
                }],
            }),
        });

        if (!response.ok) {
            console.error(`AI API error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        let rawText = data.content?.[0]?.text?.trim() ?? "";

        // Strip markdown fences if present
        rawText = rawText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

        const parsed = JSON.parse(rawText);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((j: any) => j.title && typeof j.title === "string")
            .map((j: any) => ({
                title: j.title.trim(),
                url: typeof j.url === "string" ? j.url.trim() : null,
                department: typeof j.department === "string" ? j.department.trim() : null,
            }));
    } catch (err) {
        console.error(`AI extraction error for ${hospitalName}:`, err);
        return [];
    }
}

// ─── Main Handler ────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    const runId = generateRunId();
    const startTime = Date.now();
    const shouldContinue = () => (Date.now() - startTime) < MAX_EXECUTION_MS;

    const results = {
        runId,
        hospitalsProcessed: 0,
        careerUrlsDiscovered: 0,
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        jobsMarkedGone: 0,
        errors: [] as string[],
    };

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

        // ── Auth ──
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

            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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
            const { data: roleData } = await dbAdmin
                .from("profiles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            if (roleData?.role !== "ADMIN") {
                return new Response(JSON.stringify({ error: "Nur Admins" }), {
                    status: 403,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
        }

        const db = createClient(supabaseUrl, serviceRoleKey);

        // ── Load hospitals (oldest scraped first) ──
        const { data: hospitals, error: fetchErr } = await db
            .from("berlin_hospitals")
            .select("*")
            .eq("is_active", true)
            .order("last_scraped_at", { ascending: true, nullsFirst: true })
            .limit(HOSPITALS_PER_RUN);

        if (fetchErr) throw fetchErr;
        if (!hospitals || hospitals.length === 0) {
            return new Response(JSON.stringify({ success: true, ...results, message: "No hospitals to process" }), {
                headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            });
        }

        console.log(`[${runId}] Processing ${hospitals.length} hospitals...`);

        for (const hospital of hospitals) {
            if (!shouldContinue()) {
                console.log(`[${runId}] Timeout approaching, stopping`);
                break;
            }

            console.log(`[${runId}] ── ${hospital.name} ──`);

            try {
                // ── Step 1: Resolve website URL if needed ──
                let websiteUrl = hospital.website_url;
                if (!websiteUrl && hospital.dkv_url) {
                    console.log(`[${runId}] Resolving website from DKV...`);
                    websiteUrl = await resolveWebsiteFromDkv(hospital.dkv_url);
                    if (websiteUrl) {
                        await db
                            .from("berlin_hospitals")
                            .update({ website_url: websiteUrl })
                            .eq("id", hospital.id);
                    }
                }

                if (!websiteUrl) {
                    console.warn(`[${runId}] No website URL for ${hospital.name}, skipping`);
                    await db
                        .from("berlin_hospitals")
                        .update({
                            scrape_status: "needs_manual",
                            scrape_error: "Could not resolve website URL from DKV profile",
                            last_scraped_at: new Date().toISOString(),
                        })
                        .eq("id", hospital.id);
                    results.errors.push(`${hospital.name}: no website URL`);
                    continue;
                }

                // ── Step 2: Discover career URL if needed ──
                let careerUrl = hospital.career_url;
                if (!careerUrl) {
                    console.log(`[${runId}] Discovering career URL for ${hospital.name}...`);
                    careerUrl = await discoverCareerUrl(websiteUrl);
                    if (careerUrl) {
                        results.careerUrlsDiscovered++;
                        await db
                            .from("berlin_hospitals")
                            .update({ career_url: careerUrl })
                            .eq("id", hospital.id);
                    } else {
                        console.warn(`[${runId}] No career URL found for ${hospital.name}`);
                        await db
                            .from("berlin_hospitals")
                            .update({
                                scrape_status: "needs_manual",
                                scrape_error: "Career page not found via subdomain/path probing",
                                last_scraped_at: new Date().toISOString(),
                            })
                            .eq("id", hospital.id);
                        results.errors.push(`${hospital.name}: career page not found`);
                        continue;
                    }
                }

                // ── Step 3: Fetch career page ──
                console.log(`[${runId}] Fetching: ${careerUrl}`);
                const pageResp = await fetch(careerUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "text/html,application/xhtml+xml",
                        "Accept-Language": "de-DE,de;q=0.9",
                    },
                    redirect: "follow",
                    signal: AbortSignal.timeout(15_000),
                });

                if (!pageResp.ok) {
                    console.error(`[${runId}] Career page returned ${pageResp.status}`);
                    await db
                        .from("berlin_hospitals")
                        .update({
                            scrape_status: "error",
                            scrape_error: `HTTP ${pageResp.status}`,
                            last_scraped_at: new Date().toISOString(),
                        })
                        .eq("id", hospital.id);
                    results.errors.push(`${hospital.name}: HTTP ${pageResp.status}`);
                    continue;
                }

                const html = await pageResp.text();
                console.log(`[${runId}] Got ${html.length} chars of HTML`);

                // ── Step 4: AI extraction ──
                const extractedJobs = await extractJobsWithAi(html, hospital.name, careerUrl, anthropicKey);
                console.log(`[${runId}] AI extracted ${extractedJobs.length} jobs for ${hospital.name}`);
                results.jobsFound += extractedJobs.length;

                // ── Step 5: Change detection ──
                // If hospital previously had jobs but now returns 0, flag as needs_manual
                if (extractedJobs.length === 0) {
                    const { data: existingJobs } = await db
                        .from("berlin_hospital_jobs")
                        .select("id")
                        .eq("hospital_id", hospital.id)
                        .eq("status", "active")
                        .limit(1);

                    if (existingJobs && existingJobs.length > 0) {
                        console.warn(`[${runId}] ${hospital.name} had active jobs but AI found 0 — flagging needs_manual`);
                        await db
                            .from("berlin_hospitals")
                            .update({
                                scrape_status: "needs_manual",
                                scrape_error: "Previously had jobs but now found 0 — possible scraping issue",
                                last_scraped_at: new Date().toISOString(),
                            })
                            .eq("id", hospital.id);
                        // Don't mark existing jobs as gone yet — could be a false negative
                        results.hospitalsProcessed++;
                        continue;
                    }

                    // Genuinely no jobs
                    await db
                        .from("berlin_hospitals")
                        .update({
                            scrape_status: "no_jobs",
                            scrape_error: null,
                            last_scraped_at: new Date().toISOString(),
                        })
                        .eq("id", hospital.id);
                    results.hospitalsProcessed++;
                    continue;
                }

                // ── Step 6: Upsert jobs ──
                const now = new Date().toISOString();
                const seenUrls = new Set<string>();

                for (const job of extractedJobs) {
                    const applyUrl = job.url || `${careerUrl}#${encodeURIComponent(job.title)}`;
                    seenUrls.add(applyUrl);

                    // Try to find existing job
                    const { data: existing } = await db
                        .from("berlin_hospital_jobs")
                        .select("id, status")
                        .eq("hospital_id", hospital.id)
                        .eq("apply_url", applyUrl)
                        .single();

                    if (existing) {
                        // Update last_seen, reset consecutive_misses
                        await db
                            .from("berlin_hospital_jobs")
                            .update({
                                last_seen_at: now,
                                consecutive_misses: 0,
                                status: existing.status === "gone" ? "active" : existing.status,
                                title: job.title,
                                department: job.department || undefined,
                                updated_at: now,
                            })
                            .eq("id", existing.id);
                        results.jobsUpdated++;
                    } else {
                        // Insert new job
                        await db
                            .from("berlin_hospital_jobs")
                            .insert({
                                hospital_id: hospital.id,
                                title: job.title,
                                department: job.department || null,
                                apply_url: applyUrl,
                                first_seen_at: now,
                                last_seen_at: now,
                                status: "active",
                                is_new: true,
                            });
                        results.jobsInserted++;
                    }
                }

                // ── Step 7: Increment misses for unseen active jobs ──
                const { data: activeJobs } = await db
                    .from("berlin_hospital_jobs")
                    .select("id, apply_url, consecutive_misses")
                    .eq("hospital_id", hospital.id)
                    .eq("status", "active");

                if (activeJobs) {
                    for (const activeJob of activeJobs) {
                        if (!seenUrls.has(activeJob.apply_url || "")) {
                            const newMisses = (activeJob.consecutive_misses || 0) + 1;
                            if (newMisses >= MISS_THRESHOLD) {
                                await db
                                    .from("berlin_hospital_jobs")
                                    .update({ status: "gone", consecutive_misses: newMisses, updated_at: now })
                                    .eq("id", activeJob.id);
                                results.jobsMarkedGone++;
                            } else {
                                await db
                                    .from("berlin_hospital_jobs")
                                    .update({ consecutive_misses: newMisses })
                                    .eq("id", activeJob.id);
                            }
                        }
                    }
                }

                // ── Update hospital status ──
                await db
                    .from("berlin_hospitals")
                    .update({
                        scrape_status: "success",
                        scrape_error: null,
                        last_scraped_at: now,
                    })
                    .eq("id", hospital.id);

                results.hospitalsProcessed++;
                console.log(`[${runId}] ✓ ${hospital.name}: ${extractedJobs.length} jobs found`);

                // Polite delay between hospitals
                await new Promise((r) => setTimeout(r, 1000));

            } catch (err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                console.error(`[${runId}] Error processing ${hospital.name}:`, msg);
                results.errors.push(`${hospital.name}: ${msg}`);

                await db
                    .from("berlin_hospitals")
                    .update({
                        scrape_status: "error",
                        scrape_error: msg,
                        last_scraped_at: new Date().toISOString(),
                    })
                    .eq("id", hospital.id);
            }
        }

        console.log(`[${runId}] Complete:`, JSON.stringify(results));
        return new Response(JSON.stringify({ success: true, ...results }), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(`[${runId}] Fatal error:`, err);
        return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error", ...results }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

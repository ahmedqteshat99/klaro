import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ───────────────────────────────────────────────
const HOSPITALS_PER_RUN = 5;
const MAX_EXECUTION_MS = 140_000;
const MISS_THRESHOLD = 2;

const FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
};

// ─── Helpers ─────────────────────────────────────────────────────

function generateRunId(): string {
    return `berlin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface ExtractedJob {
    title: string;
    url: string | null;
    department: string | null;
}

// ─── Strategy 1: __NEXT_DATA__ extraction (Next.js career sites) ──

function extractFromNextData(html: string, careerUrl: string): ExtractedJob[] {
    const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match?.[1]) return [];

    try {
        const nextData = JSON.parse(match[1]);
        const jobs: ExtractedJob[] = [];

        // Recursively search the data structure for job-like objects
        const searchForJobs = (obj: any, depth = 0) => {
            if (depth > 15 || !obj) return;

            if (Array.isArray(obj)) {
                for (const item of obj) searchForJobs(item, depth + 1);
                return;
            }

            if (typeof obj === "object") {
                // Vivantes-style: has PositionTitle, PositionURI, Department
                if (obj.PositionTitle || obj.PositionName) {
                    const title = obj.PositionTitle || obj.PositionName || "";
                    const dept = obj.Department || obj.ParentDepartment || obj.OrganizationName || null;
                    const url = obj.PositionURI || obj.ApplyURI || obj.Link || null;

                    // Filter for Assistenzarzt / Innere Medizin keywords
                    const combined = `${title} ${dept || ""} ${obj.JobTitle || ""}`.toLowerCase();
                    const isRelevant =
                        combined.includes("assistenzarzt") ||
                        combined.includes("assistenzärztin") ||
                        combined.includes("arzt in weiterbildung") ||
                        combined.includes("ärztin in weiterbildung") ||
                        (combined.includes("innere medizin") && (combined.includes("arzt") || combined.includes("ärztin"))) ||
                        (combined.includes("ärztlicher bereich") && (
                            combined.includes("innere") || combined.includes("kardiologie") ||
                            combined.includes("gastroenterologie") || combined.includes("nephrologie") ||
                            combined.includes("pneumologie") || combined.includes("onkologie") ||
                            combined.includes("geriatrie") || combined.includes("endokrinologie") ||
                            combined.includes("rheumatologie") || combined.includes("hämatologie")
                        ));

                    if (isRelevant && title) {
                        jobs.push({
                            title: title.trim(),
                            url: url ? (url.startsWith("http") ? url : new URL(url, careerUrl).href) : null,
                            department: dept?.trim() || null,
                        });
                    }
                }

                // Generic: has title/name + href/url/link
                if ((obj.title || obj.name) && (obj.href || obj.url || obj.link)) {
                    const title = obj.title || obj.name || "";
                    const combined = title.toLowerCase();
                    const isRelevant =
                        combined.includes("assistenzarzt") ||
                        combined.includes("assistenzärztin") ||
                        combined.includes("innere medizin") ||
                        combined.includes("arzt in weiterbildung");

                    if (isRelevant) {
                        const link = obj.href || obj.url || obj.link;
                        jobs.push({
                            title: title.trim(),
                            url: link ? (link.startsWith("http") ? link : new URL(link, careerUrl).href) : null,
                            department: obj.department || obj.category || null,
                        });
                    }
                }

                for (const key of Object.keys(obj)) {
                    searchForJobs(obj[key], depth + 1);
                }
            }
        };

        searchForJobs(nextData);

        // Deduplicate by title+url
        const seen = new Set<string>();
        return jobs.filter((j) => {
            const key = `${j.title}|${j.url}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    } catch (err) {
        console.error("Failed to parse __NEXT_DATA__:", err);
        return [];
    }
}

// ─── Strategy 2: HTML link extraction (non-JS sites) ─────────────

function extractFromHtmlLinks(html: string, careerUrl: string): ExtractedJob[] {
    const jobs: ExtractedJob[] = [];

    // Match links that contain job-related text
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
        const href = m[1];
        const text = m[2].replace(/<[^>]+>/g, "").trim();
        if (!text || text.length < 10 || text.length > 300) continue;

        const lower = text.toLowerCase();
        const isRelevant =
            lower.includes("assistenzarzt") ||
            lower.includes("assistenzärztin") ||
            lower.includes("arzt in weiterbildung") ||
            lower.includes("ärztin in weiterbildung") ||
            (lower.includes("innere medizin") && (lower.includes("arzt") || lower.includes("ärztin")));

        if (isRelevant) {
            let url: string;
            try {
                url = href.startsWith("http") ? href : new URL(href, careerUrl).href;
            } catch {
                url = href;
            }

            jobs.push({
                title: text,
                url,
                department: null,
            });
        }
    }

    // Also check for structured data (JSON-LD)
    const jsonLdRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = jsonLdRegex.exec(html)) !== null) {
        try {
            const data = JSON.parse(m[1]);
            const items = Array.isArray(data) ? data : [data];
            for (const item of items) {
                if (item["@type"] === "JobPosting") {
                    const title = item.title || item.name || "";
                    const lower = title.toLowerCase();
                    if (lower.includes("assistenzarzt") || lower.includes("innere medizin") || lower.includes("weiterbildung")) {
                        jobs.push({
                            title: title.trim(),
                            url: item.url || item.sameAs || null,
                            department: item.occupationalCategory || item.department || null,
                        });
                    }
                }
            }
        } catch { /* ignore parse errors */ }
    }

    // Deduplicate
    const seen = new Set<string>();
    return jobs.filter((j) => {
        const key = `${j.title}|${j.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ─── Strategy 3: AI extraction (fallback for complex pages) ──────

async function extractWithAi(
    html: string,
    hospitalName: string,
    careerUrl: string,
    anthropicKey: string
): Promise<ExtractedJob[]> {
    // Truncate to ~40k chars
    const truncated = html.length > 40_000 ? html.substring(0, 40_000) : html;

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
                system: "Du extrahierst Stellenangebote aus deutschen Krankenhaus-Karriereseiten. Antworte NUR mit validem JSON-Array.",
                messages: [{
                    role: "user",
                    content: `Analysiere diese Karriereseite von "${hospitalName}" (${careerUrl}).

Extrahiere alle Stellenangebote für:
- Assistenzarzt/Assistenzärztin
- Arzt/Ärztin in Weiterbildung
- Positionen in Innere Medizin und Subdisziplinen (Kardiologie, Gastroenterologie, Nephrologie, Pneumologie, Hämatologie/Onkologie, Endokrinologie, Rheumatologie, Geriatrie)

Antworte NUR mit JSON: [{"title": "...", "url": "absolute URL oder null", "department": "... oder null"}]
Wenn keine relevanten Stellen gefunden: []

HTML:
${truncated}`,
                }],
            }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        let text = data.content?.[0]?.text?.trim() ?? "";
        text = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

        const parsed = JSON.parse(text);
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

// ─── Multi-page fetcher (follows links to subpages) ──────────────

async function fetchCareerPages(careerUrl: string): Promise<{ url: string; html: string }[]> {
    const pages: { url: string; html: string }[] = [];
    const baseUrl = careerUrl.replace(/\/+$/, "");

    // Fetch the main career page
    try {
        const resp = await fetch(baseUrl, {
            headers: FETCH_HEADERS,
            redirect: "follow",
            signal: AbortSignal.timeout(15_000),
        });
        if (resp.ok) {
            const html = await resp.text();
            pages.push({ url: resp.url || baseUrl, html });
        }
    } catch (err) {
        console.error(`Failed to fetch ${baseUrl}:`, err);
    }

    // Also try /stellenangebote subpage if we're on a career landing page
    const subpages = ["/stellenangebote", "/jobs", "/offene-stellen", "/stellenmarkt"];
    for (const sub of subpages) {
        const subUrl = baseUrl + sub;
        if (subUrl === baseUrl) continue;
        try {
            const resp = await fetch(subUrl, {
                headers: FETCH_HEADERS,
                redirect: "follow",
                signal: AbortSignal.timeout(10_000),
            });
            if (resp.ok) {
                const html = await resp.text();
                // Only add if it has substantial content
                if (html.length > 1000 && !pages.some((p) => p.url === (resp.url || subUrl))) {
                    pages.push({ url: resp.url || subUrl, html });
                }
            }
        } catch { /* skip */ }
    }

    return pages;
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
        jobsFound: 0,
        jobsInserted: 0,
        jobsUpdated: 0,
        jobsMarkedGone: 0,
        errors: [] as string[],
        strategies: {} as Record<string, string>,
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
                    status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError || !user) {
                return new Response(JSON.stringify({ error: "Authentifizierung fehlgeschlagen" }), {
                    status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
            const dbAdmin = createClient(supabaseUrl, serviceRoleKey);
            const { data: roleData } = await dbAdmin.from("profiles").select("role").eq("user_id", user.id).single();
            if (roleData?.role !== "ADMIN") {
                return new Response(JSON.stringify({ error: "Nur Admins" }), {
                    status: 403, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }
        }

        const db = createClient(supabaseUrl, serviceRoleKey);

        // ── Load hospitals ──
        const { data: hospitals, error: fetchErr } = await db
            .from("berlin_hospitals")
            .select("*")
            .eq("is_active", true)
            .order("last_scraped_at", { ascending: true, nullsFirst: true })
            .limit(HOSPITALS_PER_RUN);

        if (fetchErr) throw fetchErr;
        if (!hospitals?.length) {
            return new Response(JSON.stringify({ success: true, ...results, message: "No hospitals" }), {
                headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            });
        }

        console.log(`[${runId}] Processing ${hospitals.length} hospitals...`);

        for (const hospital of hospitals) {
            if (!shouldContinue()) break;

            const careerUrl = hospital.career_url;
            if (!careerUrl) {
                await db.from("berlin_hospitals").update({
                    scrape_status: "needs_manual",
                    scrape_error: "No career URL configured",
                    last_scraped_at: new Date().toISOString(),
                }).eq("id", hospital.id);
                results.errors.push(`${hospital.name}: no career URL`);
                continue;
            }

            console.log(`[${runId}] ── ${hospital.name} (${careerUrl}) ──`);

            try {
                // ── Fetch career pages (main + subpages) ──
                const pages = await fetchCareerPages(careerUrl);
                if (pages.length === 0) {
                    await db.from("berlin_hospitals").update({
                        scrape_status: "error", scrape_error: "Could not fetch career page",
                        last_scraped_at: new Date().toISOString(),
                    }).eq("id", hospital.id);
                    results.errors.push(`${hospital.name}: fetch failed`);
                    continue;
                }

                console.log(`[${runId}] Fetched ${pages.length} pages (${pages.map(p => p.html.length + " chars").join(", ")})`);

                // ── Try extraction strategies in order ──
                let extractedJobs: ExtractedJob[] = [];
                let strategyUsed = "none";

                for (const page of pages) {
                    // Strategy 1: __NEXT_DATA__ (structured JSON, most reliable for Next.js sites)
                    if (page.html.includes("__NEXT_DATA__")) {
                        const nextJobs = extractFromNextData(page.html, page.url);
                        if (nextJobs.length > 0) {
                            extractedJobs = nextJobs;
                            strategyUsed = `next_data(${page.url})`;
                            console.log(`[${runId}] Strategy: __NEXT_DATA__ → ${nextJobs.length} jobs`);
                            break;
                        }
                    }

                    // Strategy 2: Parse HTML links + JSON-LD
                    const htmlJobs = extractFromHtmlLinks(page.html, page.url);
                    if (htmlJobs.length > 0) {
                        extractedJobs = htmlJobs;
                        strategyUsed = `html_links(${page.url})`;
                        console.log(`[${runId}] Strategy: HTML links → ${htmlJobs.length} jobs`);
                        break;
                    }
                }

                // Strategy 3: AI extraction (fallback — use the largest page)
                if (extractedJobs.length === 0) {
                    const biggestPage = pages.sort((a, b) => b.html.length - a.html.length)[0];
                    console.log(`[${runId}] Trying AI extraction on ${biggestPage.url} (${biggestPage.html.length} chars)...`);
                    extractedJobs = await extractWithAi(biggestPage.html, hospital.name, biggestPage.url, anthropicKey);
                    strategyUsed = `ai(${biggestPage.url})`;
                    console.log(`[${runId}] Strategy: AI → ${extractedJobs.length} jobs`);
                }

                results.strategies[hospital.name] = strategyUsed;
                results.jobsFound += extractedJobs.length;

                // ── Change detection ──
                if (extractedJobs.length === 0) {
                    const { data: existingActive } = await db
                        .from("berlin_hospital_jobs")
                        .select("id").eq("hospital_id", hospital.id).eq("status", "active").limit(1);

                    if (existingActive?.length) {
                        console.warn(`[${runId}] ${hospital.name}: had active jobs but found 0 → needs_manual`);
                        await db.from("berlin_hospitals").update({
                            scrape_status: "needs_manual",
                            scrape_error: "Previously had jobs but found 0 — may need URL update",
                            last_scraped_at: new Date().toISOString(),
                        }).eq("id", hospital.id);
                    } else {
                        await db.from("berlin_hospitals").update({
                            scrape_status: "no_jobs", scrape_error: null,
                            last_scraped_at: new Date().toISOString(),
                        }).eq("id", hospital.id);
                    }
                    results.hospitalsProcessed++;
                    continue;
                }

                // ── Upsert jobs ──
                const now = new Date().toISOString();
                const seenUrls = new Set<string>();

                for (const job of extractedJobs) {
                    const applyUrl = job.url || `${careerUrl}#${encodeURIComponent(job.title)}`;
                    seenUrls.add(applyUrl);

                    const { data: existing } = await db
                        .from("berlin_hospital_jobs")
                        .select("id, status")
                        .eq("hospital_id", hospital.id)
                        .eq("apply_url", applyUrl)
                        .single();

                    if (existing) {
                        await db.from("berlin_hospital_jobs").update({
                            last_seen_at: now, consecutive_misses: 0,
                            status: existing.status === "gone" ? "active" : existing.status,
                            title: job.title, department: job.department || undefined,
                            updated_at: now,
                        }).eq("id", existing.id);
                        results.jobsUpdated++;
                    } else {
                        await db.from("berlin_hospital_jobs").insert({
                            hospital_id: hospital.id,
                            title: job.title,
                            department: job.department || null,
                            apply_url: applyUrl,
                            first_seen_at: now, last_seen_at: now,
                            status: "active", is_new: true,
                        });
                        results.jobsInserted++;
                    }
                }

                // ── Track misses ──
                const { data: activeJobs } = await db
                    .from("berlin_hospital_jobs")
                    .select("id, apply_url, consecutive_misses")
                    .eq("hospital_id", hospital.id).eq("status", "active");

                if (activeJobs) {
                    for (const aj of activeJobs) {
                        if (!seenUrls.has(aj.apply_url || "")) {
                            const newMisses = (aj.consecutive_misses || 0) + 1;
                            if (newMisses >= MISS_THRESHOLD) {
                                await db.from("berlin_hospital_jobs").update({
                                    status: "gone", consecutive_misses: newMisses, updated_at: now,
                                }).eq("id", aj.id);
                                results.jobsMarkedGone++;
                            } else {
                                await db.from("berlin_hospital_jobs").update({ consecutive_misses: newMisses }).eq("id", aj.id);
                            }
                        }
                    }
                }

                await db.from("berlin_hospitals").update({
                    scrape_status: "success", scrape_error: null, last_scraped_at: now,
                }).eq("id", hospital.id);
                results.hospitalsProcessed++;
                console.log(`[${runId}] ✓ ${hospital.name}: ${extractedJobs.length} jobs (${strategyUsed})`);

                await new Promise((r) => setTimeout(r, 800));

            } catch (err) {
                const msg = err instanceof Error ? err.message : "Unknown error";
                console.error(`[${runId}] Error: ${hospital.name}:`, msg);
                results.errors.push(`${hospital.name}: ${msg}`);
                await db.from("berlin_hospitals").update({
                    scrape_status: "error", scrape_error: msg, last_scraped_at: new Date().toISOString(),
                }).eq("id", hospital.id);
            }
        }

        console.log(`[${runId}] Complete:`, JSON.stringify(results));
        return new Response(JSON.stringify({ success: true, ...results }), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(`[${runId}] Fatal:`, err);
        return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown", ...results }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ───────────────────────────────────────────────
const HOSPITALS_PER_CRON_RUN = 5;
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

// ─── Strict job relevance filter ─────────────────────────────────
// ONLY Assistenzarzt / Weiterbildungsassistent positions
// EXCLUDE senior roles: Oberarzt, Chefarzt, Facharzt, leitender Arzt

function isJobRelevant(title: string, department?: string | null, extra?: string | null): boolean {
    const combined = `${title} ${department || ""} ${extra || ""}`.toLowerCase();

    // MUST match at least one of these (positive filter)
    const INCLUDE_PATTERNS = [
        "assistenzarzt",
        "assistenzärztin",
        "weiterbildungsassistent",
        "weiterbildungsassistentin",
        "arzt in weiterbildung",
        "ärztin in weiterbildung",
        "arzt/ärztin in weiterbildung",
        "weiterbildungsstelle",
    ];

    const hasInclude = INCLUDE_PATTERNS.some((p) => combined.includes(p));
    if (!hasInclude) return false;

    // MUST NOT match any of these (negative filter — senior roles)
    const EXCLUDE_PATTERNS = [
        "oberarzt",
        "oberärztin",
        "chefarzt",
        "chefärztin",
        "facharzt",
        "fachärztin",
        "leitender arzt",
        "leitende ärztin",
        "sektionsleiter",
        "sektionsleiterin",
        "abteilungsleiter",
        "abteilungsleiterin",
    ];

    // Only exclude if the title ITSELF contains the senior role
    // (department may say "Facharztweiterbildung" which is OK)
    const titleLower = title.toLowerCase();
    const hasExclude = EXCLUDE_PATTERNS.some((p) => titleLower.includes(p));
    if (hasExclude) return false;

    return true;
}

// ─── Strategy 1: __NEXT_DATA__ extraction (Next.js career sites) ──

function extractFromNextData(html: string, careerUrl: string, hospitalName: string): ExtractedJob[] {
    const match = html.match(/<script\s+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match?.[1]) return [];

    // Build keywords from hospital name for matching OrganizationName
    // e.g. "Vivantes Klinikum Kaulsdorf" → ["kaulsdorf"]
    // e.g. "Charité Campus Benjamin Franklin" → ["benjamin", "franklin"]
    const hospitalWords = hospitalName.toLowerCase()
        .replace(/^(vivantes|charité|charite|helios|sana|drk|immanuel|alexianer)\s*/i, "")
        .replace(/^(klinikum|krankenhaus|campus)\s*/i, "")
        .split(/\s+/)
        .filter((w) => w.length > 3);

    const matchesHospital = (orgName: string | null | undefined): boolean => {
        if (!orgName) return true; // if no org name, accept the job
        if (hospitalWords.length === 0) return true; // can't filter
        const orgLower = orgName.toLowerCase();
        // At least one distinguished word from hospital name must match
        return hospitalWords.some((w) => orgLower.includes(w));
    };

    try {
        const nextData = JSON.parse(match[1]);
        const jobs: ExtractedJob[] = [];

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
                    const dept = obj.Department || obj.ParentDepartment || null;
                    const orgName = obj.OrganizationName || null;
                    const url = obj.PositionURI || obj.ApplyURI || obj.Link || null;

                    // Only include if job belongs to THIS hospital
                    if (title && isJobRelevant(title, dept, obj.JobTitle) && matchesHospital(orgName)) {
                        jobs.push({
                            title: title.trim(),
                            url: url ? (url.startsWith("http") ? url : new URL(url, careerUrl).href) : null,
                            department: (orgName || dept)?.trim() || null,
                        });
                    }
                }

                // Generic: has title/name + href/url/link
                if ((obj.title || obj.name) && (obj.href || obj.url || obj.link)) {
                    const title = obj.title || obj.name || "";
                    if (isJobRelevant(title)) {
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

        const isRelevant = isJobRelevant(text);

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
                    if (isJobRelevant(title, item.occupationalCategory || item.department)) {
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

Extrahiere NUR Stellenangebote die EXPLIZIT diese Begriffe im Titel enthalten:
- "Assistenzarzt" oder "Assistenzärztin"
- "Weiterbildungsassistent" oder "Weiterbildungsassistentin"
- "Arzt/Ärztin in Weiterbildung"

SCHLIESSE EXPLIZIT AUS (NICHT hinzufügen):
- Oberarzt/Oberärztin
- Chefarzt/Chefärztin
- Facharzt/Fachärztin
- Leitende Ärzte
- Pflegekräfte, Therapeuten, Verwaltung

Antworte NUR mit JSON: [{"title": "Exakter Stellentitel", "url": "absolute URL oder null", "department": "Fachbereich oder null"}]
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
            .filter((j: any) => j.title && typeof j.title === "string" && isJobRelevant(j.title, j.department))
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

// ─── Strategy 4: Follow detail links from listing pages ──────────
// For JS-rendered listing pages where individual job pages ARE server-rendered

async function extractByFollowingLinks(html: string, careerUrl: string): Promise<ExtractedJob[]> {
    const jobs: ExtractedJob[] = [];
    const baseUrl = new URL(careerUrl).origin;

    // Find all links that look like individual job detail pages
    const linkPatterns = [
        /href="([^"]*(?:detail|stelle|job|position|vacancy|vacancies|posting)[^"]*)"/gi,
        /href="([^"]*\/\d{3,}[^"]*)"/gi, // numeric IDs like /stellenangebote/1234
    ];

    const detailUrls = new Set<string>();
    for (const pattern of linkPatterns) {
        let m;
        while ((m = pattern.exec(html)) !== null) {
            let href = m[1];
            // Skip anchors, mailto, tel, javascript, css, images
            if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") ||
                href.startsWith("javascript:") || href.match(/\.(css|js|png|jpg|jpeg|gif|svg|pdf|ico)/i)) continue;
            // Make absolute
            try {
                href = href.startsWith("http") ? href : new URL(href, careerUrl).href;
            } catch { continue; }
            detailUrls.add(href);
        }
    }

    if (detailUrls.size === 0) return [];

    // Limit to 40 detail pages max to avoid timeouts
    const urlsToCheck = Array.from(detailUrls).slice(0, 40);
    console.log(`  Following ${urlsToCheck.length} detail links...`);

    // Fetch detail pages in batches of 5
    for (let i = 0; i < urlsToCheck.length; i += 5) {
        const batch = urlsToCheck.slice(i, i + 5);
        const results = await Promise.allSettled(
            batch.map(async (url) => {
                try {
                    const resp = await fetch(url, {
                        headers: FETCH_HEADERS,
                        redirect: "follow",
                        signal: AbortSignal.timeout(8_000),
                    });
                    if (!resp.ok) return null;
                    const detailHtml = await resp.text();

                    // Extract title from <title> tag
                    const titleMatch = detailHtml.match(/<title>([^<]+)<\/title>/i);
                    let title = titleMatch?.[1]?.trim() || "";

                    // Also try <h1>
                    if (!title || title.length < 5) {
                        const h1Match = detailHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
                        title = h1Match?.[1]?.trim() || title;
                    }

                    // Clean up title (remove site name suffix)
                    title = title.replace(/\s*[:|–\-]\s*(Charité|Vivantes|Sana|Helios|DRK|Alexianer|Immanuel|Bethel).*$/i, "").trim();

                    if (!title || !isJobRelevant(title)) return null;

                    // Try to extract department from meta or the page
                    let dept: string | null = null;
                    const metaDept = detailHtml.match(/(?:Klinik|Abteilung|Bereich|Department)[:\s]+([^<\n]{5,80})/i);
                    if (metaDept) dept = metaDept[1].trim();

                    return {
                        title,
                        url: resp.url || url,
                        department: dept,
                    } as ExtractedJob;
                } catch {
                    return null;
                }
            })
        );

        for (const r of results) {
            if (r.status === "fulfilled" && r.value) {
                jobs.push(r.value);
            }
        }
    }

    // Deduplicate
    const seen = new Set<string>();
    return jobs.filter((j) => {
        const key = j.title.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
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
        // Manual admin scan: process ALL hospitals
        // Cron job: process 5 at a time to avoid timeouts
        let query = db
            .from("berlin_hospitals")
            .select("*")
            .eq("is_active", true)
            .order("last_scraped_at", { ascending: true, nullsFirst: true });

        if (isCron) {
            query = query.limit(HOSPITALS_PER_CRON_RUN);
        }

        const { data: hospitals, error: fetchErr } = await query;

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
                        const nextJobs = extractFromNextData(page.html, page.url, hospital.name);
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

                // Strategy 4: Follow detail links (for JS-rendered listing pages)
                if (extractedJobs.length === 0) {
                    for (const page of pages) {
                        console.log(`[${runId}] Trying follow-links on ${page.url}...`);
                        const linkJobs = await extractByFollowingLinks(page.html, page.url);
                        if (linkJobs.length > 0) {
                            extractedJobs = linkJobs;
                            strategyUsed = `follow_links(${page.url})`;
                            console.log(`[${runId}] Strategy: follow-links → ${linkJobs.length} jobs`);
                            break;
                        }
                    }
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

                // ── Deduplicate extracted jobs by title ──
                const seenTitles = new Set<string>();
                const uniqueJobs = extractedJobs.filter((j) => {
                    const key = j.title.toLowerCase().trim();
                    if (seenTitles.has(key)) return false;
                    seenTitles.add(key);
                    return true;
                });

                // ── Upsert jobs ──
                const now = new Date().toISOString();
                const seenUrls = new Set<string>();

                for (const job of uniqueJobs) {
                    const applyUrl = job.url || `${careerUrl}#${encodeURIComponent(job.title)}`;
                    seenUrls.add(applyUrl);

                    // Match by hospital + title (primary dedup key)
                    const { data: existingByTitle } = await db
                        .from("berlin_hospital_jobs")
                        .select("id, status, apply_url")
                        .eq("hospital_id", hospital.id)
                        .eq("title", job.title)
                        .limit(1)
                        .maybeSingle();

                    // Also check by URL as fallback
                    const { data: existingByUrl } = !existingByTitle ? await db
                        .from("berlin_hospital_jobs")
                        .select("id, status, apply_url")
                        .eq("hospital_id", hospital.id)
                        .eq("apply_url", applyUrl)
                        .limit(1)
                        .maybeSingle() : { data: null };

                    const existing = existingByTitle || existingByUrl;

                    // Also check globally by URL to prevent cross-hospital duplicates
                    const { data: existingGlobal } = !existing ? await db
                        .from("berlin_hospital_jobs")
                        .select("id")
                        .eq("apply_url", applyUrl)
                        .limit(1)
                        .maybeSingle() : { data: null };

                    if (existingGlobal) {
                        console.log(`[${runId}] Skipped (exists in another hospital): ${job.title}`);
                        continue;
                    }

                    if (existing) {
                        // Also add old URL to seenUrls to prevent miss-tracking
                        if (existing.apply_url) seenUrls.add(existing.apply_url);

                        await db.from("berlin_hospital_jobs").update({
                            last_seen_at: now, consecutive_misses: 0,
                            status: existing.status === "gone" ? "active" : existing.status,
                            title: job.title,
                            department: job.department || undefined,
                            apply_url: applyUrl, // update URL in case it changed
                            updated_at: now,
                        }).eq("id", existing.id);
                        results.jobsUpdated++;
                    } else {
                        // Insert — catch constraint violation as safety net
                        const { error: insertErr } = await db.from("berlin_hospital_jobs").insert({
                            hospital_id: hospital.id,
                            title: job.title,
                            department: job.department || null,
                            apply_url: applyUrl,
                            first_seen_at: now, last_seen_at: now,
                            status: "active", is_new: true,
                        });
                        if (insertErr) {
                            if (insertErr.message.includes("duplicate") || insertErr.message.includes("unique")) {
                                console.log(`[${runId}] Skipped duplicate: ${job.title}`);
                            } else {
                                console.error(`[${runId}] Insert error: ${insertErr.message}`);
                            }
                        } else {
                            results.jobsInserted++;
                        }
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

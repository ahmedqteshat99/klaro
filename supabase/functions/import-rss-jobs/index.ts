import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ─── Configuration ───────────────────────────────────────────────
const RSS_URL = "https://www.stellenmarkt.de/rss/smrssbf9.xml";
const FEED_SOURCE = "stellenmarkt_medizin";
const KEYWORD = "assistenzarzt";
const MAX_JOBS_PER_RUN = 50; // Circuit breaker
const EXPIRATION_GRACE_HOURS = 48;

// ─── Helpers ─────────────────────────────────────────────────────

function generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Simple SHA-256 hash of a string, returned as hex. */
async function sha256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/** Strip HTML tags and decode common entities from RSS content. */
function cleanText(raw: string): string {
    return raw
        .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

interface RssItem {
    title: string;
    link: string;
    description: string;
    guid: string;
}

/** Parse RSS XML into structured items. */
function parseRss(xml: string): RssItem[] {
    const items: RssItem[] = [];
    // Use regex-based parsing (DOMParser not available in all Deno versions)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemXml = match[1];

        const getTag = (tag: string): string => {
            const tagRegex = new RegExp(`<${tag}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*</${tag}>`, "i");
            const m = itemXml.match(tagRegex);
            return m ? m[1].trim() : "";
        };

        const title = cleanText(getTag("title"));
        const link = getTag("link").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
        const description = cleanText(getTag("description"));
        const guid = getTag("guid").replace(/<!\[CDATA\[|\]\]>/g, "").trim();

        if (title && (guid || link)) {
            items.push({ title, link, description, guid: guid || link });
        }
    }

    return items;
}

/** Generate an AI summary for a job using Claude. */
async function generateAiSummary(
    item: RssItem,
    apiKey: string
): Promise<string> {
    try {
        const prompt = `Basierend auf dieser Stellenanzeige, schreibe eine professionelle, einladende Zusammenfassung in 2-3 Sätzen auf Deutsch.
Beschreibe kurz: Was für eine Stelle/Klinik ist es, was sind die Hauptaufgaben, und was macht die Position attraktiv.

TITEL: ${item.title}
BESCHREIBUNG: ${item.description.substring(0, 3000)}

Antworte NUR mit der Zusammenfassung, keine Anführungszeichen, keine Erklärungen.`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-5-20250929",
                max_tokens: 250,
                system: "Du schreibst kurze, professionelle Stellenzusammenfassungen auf Deutsch. Antworte nur mit dem Text.",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) {
            console.error(`AI API error: ${response.status}`);
            return item.description.substring(0, 300); // Fallback to truncated raw text
        }

        const data = await response.json();
        const text = data.content?.[0]?.text?.trim();
        return text && text.length > 10 ? text : item.description.substring(0, 300);
    } catch (err) {
        console.error("AI summary error:", err);
        return item.description.substring(0, 300);
    }
}

// ─── Main Handler ────────────────────────────────────────────────

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    const runId = generateRunId();
    const results = {
        runId,
        totalFeedItems: 0,
        matchingItems: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        expired: 0,
        errors: 0,
        errorMessages: [] as string[],
    };

    try {
        // ── Auth check: admin only ──
        const authHeader = req.headers.get("Authorization");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
                status: 401,
                headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            });
        }

        // Create client with service role key but user's auth header for identity
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

        // Check admin role
        const { data: roleData } = await supabaseClient
            .from("user_roles")
            .select("role")
            .eq("user_id", userData.user.id)
            .single();

        if (roleData?.role !== "admin") {
            return new Response(JSON.stringify({ error: "Nur Admins" }), {
                status: 403,
                headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            });
        }

        // Create a clean service role client for DB operations (no user auth header)
        const db = createClient(supabaseUrl, serviceRoleKey);

        // ── Rate limit: check last run ──
        const { data: lastRun } = await db
            .from("job_import_logs")
            .select("created_at")
            .eq("action", "run_started")
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (lastRun) {
            const lastRunAge = Date.now() - new Date(lastRun.created_at).getTime();
            if (lastRunAge < 60 * 60 * 1000) { // Less than 1 hour ago
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: "Zu früh. Letzter Import vor weniger als 1 Stunde.",
                        lastRun: lastRun.created_at,
                    }),
                    { headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
                );
            }
        }

        // Log run start
        await db.from("job_import_logs").insert({
            run_id: runId,
            action: "run_started",
            details: { feed_url: RSS_URL, keyword: KEYWORD },
        });

        // ── 1. Fetch RSS feed ──
        console.log(`[${runId}] Fetching RSS feed...`);
        let rssXml: string;

        try {
            const rssResponse = await fetch(RSS_URL, {
                headers: {
                    "User-Agent": "Klaro/1.0 (https://klaro.tools; job-import-bot)",
                    "Accept": "application/rss+xml, application/xml, text/xml",
                },
                signal: AbortSignal.timeout(30_000), // 30s timeout
            });

            if (!rssResponse.ok) {
                // Retry once after 5s
                console.warn(`[${runId}] RSS fetch failed (${rssResponse.status}), retrying...`);
                await new Promise((r) => setTimeout(r, 5000));

                const retryResponse = await fetch(RSS_URL, {
                    headers: {
                        "User-Agent": "Klaro/1.0 (https://klaro.tools; job-import-bot)",
                        "Accept": "application/rss+xml, application/xml, text/xml",
                    },
                    signal: AbortSignal.timeout(30_000),
                });

                if (!retryResponse.ok) {
                    throw new Error(`RSS fetch failed after retry: ${retryResponse.status}`);
                }
                rssXml = await retryResponse.text();
            } else {
                rssXml = await rssResponse.text();
            }
        } catch (fetchErr) {
            const msg = fetchErr instanceof Error ? fetchErr.message : "Unknown fetch error";
            await db.from("job_import_logs").insert({
                run_id: runId,
                action: "error",
                details: { phase: "fetch", error: msg },
            });
            throw new Error(`RSS fetch error: ${msg}`);
        }

        // ── 2. Parse RSS items ──
        const allItems = parseRss(rssXml);
        results.totalFeedItems = allItems.length;
        console.log(`[${runId}] Parsed ${allItems.length} items from feed`);

        if (allItems.length === 0) {
            await db.from("job_import_logs").insert({
                run_id: runId,
                action: "error",
                details: { phase: "parse", error: "No items found in RSS feed", xmlLength: rssXml.length },
            });
            throw new Error("No items found in RSS feed — possible parsing error");
        }

        // ── 3. Filter for keyword ──
        const matchingItems = allItems.filter(
            (item) =>
                item.title.toLowerCase().includes(KEYWORD) ||
                item.description.toLowerCase().includes(KEYWORD)
        );
        results.matchingItems = matchingItems.length;

        // Log filtered out count
        const filteredOutCount = allItems.length - matchingItems.length;
        if (filteredOutCount > 0) {
            await db.from("job_import_logs").insert({
                run_id: runId,
                action: "filtered_out",
                details: { count: filteredOutCount, keyword: KEYWORD },
            });
        }

        console.log(`[${runId}] ${matchingItems.length} items match keyword "${KEYWORD}"`);

        // Circuit breaker
        const itemsToProcess = matchingItems.slice(0, MAX_JOBS_PER_RUN);

        // ── 4. Load existing RSS jobs for dedup ──
        const { data: existingJobs } = await db
            .from("jobs")
            .select("id, rss_guid, rss_content_hash, import_status")
            .eq("rss_feed_source", FEED_SOURCE)
            .not("rss_guid", "is", null);

        const existingByGuid = new Map(
            (existingJobs ?? []).map((j) => [j.rss_guid, j])
        );

        const seenGuids = new Set<string>();

        // ── 5. Process each matching item ──
        for (const item of itemsToProcess) {
            seenGuids.add(item.guid);

            try {
                const contentHash = await sha256(item.title + item.description);
                const existing = existingByGuid.get(item.guid);

                if (existing) {
                    // ── Existing job ──
                    // Always update last_seen
                    await db
                        .from("jobs")
                        .update({ rss_last_seen_at: new Date().toISOString() })
                        .eq("id", existing.id);

                    if (existing.rss_content_hash === contentHash) {
                        // Content unchanged
                        results.skipped++;
                        await db.from("job_import_logs").insert({
                            run_id: runId,
                            action: "skipped",
                            rss_guid: item.guid,
                            job_id: existing.id,
                            job_title: item.title,
                            details: { reason: "content_unchanged" },
                        });
                        continue;
                    }

                    // Content changed — update description but keep approval status
                    const newSummary = await generateAiSummary(item, anthropicKey);
                    await db
                        .from("jobs")
                        .update({
                            description: newSummary,
                            rss_content_hash: contentHash,
                            rss_last_seen_at: new Date().toISOString(),
                        })
                        .eq("id", existing.id);

                    results.updated++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "updated",
                        rss_guid: item.guid,
                        job_id: existing.id,
                        job_title: item.title,
                        details: { reason: "content_changed" },
                    });
                    console.log(`[${runId}] Updated: ${item.title}`);
                } else {
                    // ── New job ──
                    const summary = await generateAiSummary(item, anthropicKey);

                    const { data: inserted, error: insertErr } = await db
                        .from("jobs")
                        .insert({
                            title: item.title,
                            description: summary,
                            apply_url: item.link,
                            source_url: item.link,
                            source_name: "stellenmarkt.de",
                            rss_guid: item.guid,
                            rss_content_hash: contentHash,
                            rss_imported_at: new Date().toISOString(),
                            rss_last_seen_at: new Date().toISOString(),
                            rss_feed_source: FEED_SOURCE,
                            import_status: "pending_review",
                            is_published: false,
                            scraped_at: new Date().toISOString(),
                        })
                        .select("id")
                        .single();

                    if (insertErr) {
                        // Could be a unique constraint violation (race condition)
                        if (insertErr.message?.includes("unique") || insertErr.message?.includes("duplicate")) {
                            results.skipped++;
                            console.log(`[${runId}] Duplicate skipped: ${item.title}`);
                            continue;
                        }
                        throw insertErr;
                    }

                    results.imported++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "imported",
                        rss_guid: item.guid,
                        job_id: inserted?.id,
                        job_title: item.title,
                    });
                    console.log(`[${runId}] Imported: ${item.title}`);

                    // Small delay between AI calls
                    await new Promise((r) => setTimeout(r, 400));
                }
            } catch (itemErr) {
                results.errors++;
                const msg = itemErr instanceof Error ? itemErr.message : "Unknown error";
                results.errorMessages.push(`${item.title}: ${msg}`);
                await db.from("job_import_logs").insert({
                    run_id: runId,
                    action: "error",
                    rss_guid: item.guid,
                    job_title: item.title,
                    details: { error: msg },
                });
                console.error(`[${runId}] Error processing "${item.title}":`, msg);
            }
        }

        // ── 6. Mark expired jobs ──
        const expirationThreshold = new Date(
            Date.now() - EXPIRATION_GRACE_HOURS * 60 * 60 * 1000
        ).toISOString();

        for (const [guid, existing] of existingByGuid) {
            if (!seenGuids.has(guid) && existing.import_status === "pending_review") {
                // Only expire pending jobs, not published or rejected
                const { data: jobData } = await db
                    .from("jobs")
                    .select("rss_last_seen_at")
                    .eq("id", existing.id)
                    .single();

                if (jobData?.rss_last_seen_at && jobData.rss_last_seen_at < expirationThreshold) {
                    await db
                        .from("jobs")
                        .update({ import_status: "expired" })
                        .eq("id", existing.id);

                    results.expired++;
                    await db.from("job_import_logs").insert({
                        run_id: runId,
                        action: "expired",
                        rss_guid: guid,
                        job_id: existing.id,
                        details: { last_seen: jobData.rss_last_seen_at },
                    });
                    console.log(`[${runId}] Expired: ${guid}`);
                }
            }
        }

        // ── Log run completion ──
        await db.from("job_import_logs").insert({
            run_id: runId,
            action: "run_completed",
            details: results,
        });

        console.log(`[${runId}] Complete:`, JSON.stringify(results));

        return new Response(JSON.stringify({ success: true, ...results }), {
            headers: { ...corsHeaders(req), "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error(`[${runId}] Fatal error:`, err);
        const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
        return new Response(
            JSON.stringify({ success: false, error: errorMessage, ...results }),
            {
                status: 500,
                headers: { ...corsHeaders(req), "Content-Type": "application/json" },
            }
        );
    }
});

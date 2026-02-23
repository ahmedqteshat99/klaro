import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface AiFieldResult {
    department: string | null;
    tags: string[];
}

interface BackfillJobRow {
    id: string;
    title: string;
    hospital_name: string | null;
    location: string | null;
    description: string | null;
    field_backfill_attempts: number | null;
}

interface DepartmentRule {
    department: string;
    patterns: RegExp[];
}

interface TagRule {
    tag: string;
    pattern: RegExp;
}

const DEPARTMENT_RULES: DepartmentRule[] = [
    {
        department: "Notaufnahme",
        patterns: [/\bnotaufnahme\b/i, /\bzentrale notaufnahme\b/i, /\bzna\b/i, /\brettungsstelle\b/i],
    },
    {
        department: "Intensivmedizin",
        patterns: [/\bintensivmedizin\b/i, /\bintensivstation\b/i, /\bits\b/i],
    },
    {
        department: "Anästhesie",
        patterns: [/\banaesthes/i, /\banasthes/i, /\bnarkose\b/i],
    },
    {
        department: "Kardiologie",
        patterns: [/\bkardiolog/i],
    },
    {
        department: "Neurologie",
        patterns: [/\bneurolog/i, /\bstroke unit\b/i],
    },
    {
        department: "Radiologie",
        patterns: [/\bradiolog/i, /\bbildgebung\b/i, /\bmrt\b/i, /\bct\b/i],
    },
    {
        department: "Pädiatrie",
        patterns: [/\bpaediatr/i, /\bpadiatr/i, /\bkinderheilkunde\b/i, /\bkinderklinik\b/i, /\bkindermedizin\b/i],
    },
    {
        department: "Gynäkologie",
        patterns: [/\bgynaekolog/i, /\bgynakolog/i, /\bfrauenheilkunde\b/i, /\bgeburtshilfe\b/i, /\bobstetrik\b/i],
    },
    {
        department: "Psychiatrie",
        patterns: [/\bpsychiatr/i, /\bpsychosomatik\b/i, /\bpsychotherapie\b/i],
    },
    {
        department: "Urologie",
        patterns: [/\burolog/i],
    },
    {
        department: "Dermatologie",
        patterns: [/\bdermatolog/i, /\bhautklinik\b/i],
    },
    {
        department: "HNO",
        patterns: [/\bhno\b/i, /\bhals[- ]?nasen[- ]?ohren\b/i],
    },
    {
        department: "Augenheilkunde",
        patterns: [/\baugenheil/i, /\bophthalmolog/i],
    },
    {
        department: "Orthopädie",
        patterns: [/\borthopaed/i, /\borthopad/i],
    },
    {
        department: "Chirurgie",
        patterns: [/\bchirurg/i, /\bunfallchirurg/i, /\bviszeralchirurg/i, /\bgefaesschirurg/i, /\bthoraxchirurg/i],
    },
    {
        department: "Innere Medizin",
        patterns: [/\binnere medizin\b/i, /\binternist/i, /\binternistische\b/i],
    },
];

const TAG_RULES: TagRule[] = [
    { tag: "Vollzeit", pattern: /\bvollzeit\b/i },
    { tag: "Teilzeit", pattern: /\bteilzeit\b/i },
    { tag: "Weiterbildung", pattern: /\bweiterbildung\b/i },
    { tag: "Notaufnahme", pattern: /\bnotaufnahme\b/i },
    { tag: "Intensivstation", pattern: /\bintensivstation\b/i },
    { tag: "OP", pattern: /\bop\b/i },
    { tag: "Schichtdienst", pattern: /\bschichtdienst\b/i },
    { tag: "Tarifvertrag", pattern: /\btarifvertrag\b/i },
];

function normalizeText(value: string | null | undefined): string {
    if (!value) return "";
    return value
        .toLocaleLowerCase("de-DE")
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss");
}

function detectDepartment(text: string): string | null {
    if (!text) return null;
    for (const rule of DEPARTMENT_RULES) {
        if (rule.patterns.some((pattern) => pattern.test(text))) {
            return rule.department;
        }
    }
    return null;
}

function uniqueTags(tags: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tag of tags) {
        if (!seen.has(tag)) {
            seen.add(tag);
            result.push(tag);
        }
    }
    return result;
}

function inferRuleBasedFields(title: string, description: string | null): AiFieldResult {
    const normalizedTitle = normalizeText(title);
    const normalizedDescription = normalizeText(description);
    const combined = `${normalizedTitle}\n${normalizedDescription}`;

    const departmentFromTitle = detectDepartment(normalizedTitle);
    const departmentFromDescription = detectDepartment(normalizedDescription);
    const department = departmentFromTitle ?? departmentFromDescription;

    const tags: string[] = [];
    for (const rule of TAG_RULES) {
        if (rule.pattern.test(combined)) {
            tags.push(rule.tag);
        }
    }
    if (/\bassistenzarzt\b/i.test(combined) || /\barzt in weiterbildung\b/i.test(combined) || /\baiw\b/i.test(combined)) {
        tags.push("Weiterbildung");
    }

    return {
        department,
        tags: uniqueTags(tags).slice(0, 5),
    };
}

async function inferJobFieldsWithAi(
    title: string,
    company: string | null,
    location: string | null,
    description: string | null,
    apiKey: string
): Promise<AiFieldResult> {
    const fallback: AiFieldResult = { department: null, tags: [] };

    try {
        const contextParts = [
            `TITEL: ${title}`,
            company ? `ARBEITGEBER: ${company}` : null,
            location ? `STANDORT: ${location}` : null,
            description ? `BESCHREIBUNG: ${description.slice(0, 1400)}` : null,
        ].filter(Boolean).join("\n");

        const prompt = `Analysiere diese deutsche Stellenanzeige (Titel + Kurzbeschreibung) fuer Assistenzarzt-Rollen und extrahiere strukturierte Daten.

${contextParts}

Antworte NUR mit validem JSON (kein Markdown):
{
  "department": "Medizinischer Fachbereich auf Deutsch, z.B. Innere Medizin, Chirurgie, Pädiatrie, Gynäkologie, Anästhesie, Notaufnahme, Psychiatrie, Radiologie, Neurologie, Orthopädie, Urologie, Dermatologie, HNO, Augenheilkunde, Kardiologie. Gib null zurück wenn nicht eindeutig erkennbar.",
  "tags": ["Vollzeit oder Teilzeit (falls erkennbar)", "Weiterbildung (falls erwähnt)", "weitere medizinische Stichworte, max 4 gesamt"]
}`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5-20250929",
                max_tokens: 200,
                system: "Du extrahierst medizinische Fachbereiche aus deutschen Stellenanzeigen. Antworte NUR mit JSON.",
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!response.ok) return fallback;

        const data = await response.json();
        let rawText = data.content?.[0]?.text?.trim() ?? "";
        rawText = rawText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

        const parsed = JSON.parse(rawText);

        const department = typeof parsed.department === "string" && parsed.department.length > 1
            ? parsed.department.trim()
            : null;

        const tags = Array.isArray(parsed.tags)
            ? parsed.tags
                .filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0)
                .map((t: string) => t.trim())
                .slice(0, 5)
            : [];

        return { department, tags };
    } catch {
        return fallback;
    }
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders(req) });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

        // Service role client used for all DB operations
        const db = createClient(supabaseUrl, serviceRoleKey);

        // Check cron secret FIRST — bypasses user auth entirely
        const cronSecret = Deno.env.get("CRON_SECRET");
        const headerSecret = req.headers.get("x-cron-secret");
        const isCron = cronSecret && headerSecret === cronSecret;

        if (!isCron) {
            // Not a cron call — require user JWT + admin role
            const authHeader = req.headers.get("Authorization");
            if (!authHeader) {
                return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
                    status: 401,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }

            const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
                global: { headers: { Authorization: authHeader } },
            });
            const { data: { user }, error: userError } = await anonClient.auth.getUser();
            if (userError || !user) {
                return new Response(JSON.stringify({ error: "Authentifizierung fehlgeschlagen" }), {
                    status: 401,
                    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
                });
            }

            const { data: roleData } = await db
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


        // Parse optional batch size from request body
        const body = await req.json().catch(() => ({}));
        const batchSize = Math.min(Number(body?.batchSize) || 50, 200);
        const maxAttempts = Math.min(Math.max(Number(body?.maxAttempts) || 2, 1), 5);
        const onlySource = body?.source as string | undefined; // e.g. "stellenmarkt_medizin"

        if (!anthropicKey) {
            console.warn("ANTHROPIC_API_KEY nicht gesetzt. Nutze nur regelbasiertes Backfill.");
        }

        // Fetch RSS-imported jobs missing department and still eligible for backfill.
        let query = db
            .from("jobs")
            .select("id, title, hospital_name, location, description, field_backfill_attempts, field_backfill_status, field_backfill_last_attempt_at")
            .is("department", null)
            .not("rss_guid", "is", null)
            .in("field_backfill_status", ["pending", "error"])
            .lt("field_backfill_attempts", maxAttempts)
            .order("field_backfill_attempts", { ascending: true })
            .order("field_backfill_last_attempt_at", { ascending: true, nullsFirst: true })
            .order("id", { ascending: true })
            .limit(batchSize);

        if (onlySource) {
            query = query.eq("rss_feed_source", onlySource);
        }

        const { data: jobs, error: fetchError } = await query;
        if (fetchError) throw new Error(`Laden fehlgeschlagen: ${fetchError.message}`);
        const typedJobs = (jobs ?? []) as BackfillJobRow[];

        if (typedJobs.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: "Keine Jobs fuer Backfill gefunden",
                updated: 0,
                skipped: 0,
                failed: 0,
            }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
        }

        console.log(`Backfilling department/tags for ${typedJobs.length} jobs...`);

        const results = {
            total: typedJobs.length,
            updated: 0,
            failed: 0,
            skipped: 0,
            classified_by_rules: 0,
            classified_by_ai: 0,
            ai_fallback_calls: 0,
        };

        for (const job of typedJobs) {
            const nextAttemptCount = (job.field_backfill_attempts ?? 0) + 1;
            try {
                const ruleBased = inferRuleBasedFields(job.title, job.description);
                let department = ruleBased.department;
                let tags = ruleBased.tags;
                let classifiedBy: "rules" | "ai" = "rules";

                if (!department && tags.length === 0 && anthropicKey) {
                    results.ai_fallback_calls++;
                    const aiResult = await inferJobFieldsWithAi(
                        job.title,
                        job.hospital_name,
                        job.location,
                        job.description,
                        anthropicKey
                    );
                    department = aiResult.department;
                    tags = aiResult.tags;
                    classifiedBy = "ai";

                    // Polite delay only when hitting AI.
                    await new Promise((r) => setTimeout(r, 500));
                }

                const updatePayload: Record<string, unknown> = {
                    field_backfill_attempts: nextAttemptCount,
                    field_backfill_last_attempt_at: new Date().toISOString(),
                    field_backfill_last_error: null,
                };

                if (!department && tags.length === 0) {
                    updatePayload.field_backfill_status = "no_signal";
                    const { error: noSignalUpdateError } = await db
                        .from("jobs")
                        .update(updatePayload)
                        .eq("id", job.id);

                    if (noSignalUpdateError) {
                        results.failed++;
                        console.error(`✗ Status update error ${job.id}:`, noSignalUpdateError.message);
                        continue;
                    }

                    results.skipped++;
                    console.log(`→ Skipped (no data): ${job.title}`);
                    continue;
                }

                if (department) updatePayload.department = department;
                if (tags.length > 0) updatePayload.tags = tags;
                updatePayload.field_backfill_status = "classified";

                const { error: updateError } = await db
                    .from("jobs")
                    .update(updatePayload)
                    .eq("id", job.id);

                if (updateError) {
                    results.failed++;
                    console.error(`✗ Update error ${job.id}:`, updateError.message);
                } else {
                    results.updated++;
                    if (classifiedBy === "rules") results.classified_by_rules++;
                    else results.classified_by_ai++;
                    console.log(`✓ ${job.title} → dept: ${department ?? "null"}, tags: [${tags.join(", ")}]`);
                }
            } catch (err) {
                results.failed++;
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`✗ Error for ${job.id}:`, errorMessage);

                await db
                    .from("jobs")
                    .update({
                        field_backfill_attempts: nextAttemptCount,
                        field_backfill_last_attempt_at: new Date().toISOString(),
                        field_backfill_status: "error",
                        field_backfill_last_error: errorMessage.slice(0, 500),
                    })
                    .eq("id", job.id);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            ...results,
            message: `${results.updated} von ${results.total} Jobs aktualisiert`,
        }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });

    } catch (err) {
        console.error("Backfill fatal error:", err);
        return new Response(
            JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unbekannter Fehler" }),
            { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
        );
    }
});

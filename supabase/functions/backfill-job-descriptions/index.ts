import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, RATE_LIMITS, RateLimitError, rateLimitResponse } from "../_shared/rate-limit.ts";
import { fetchAnthropicWithRetry } from "../_shared/anthropic-retry.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders(req) });
    }

    try {
        // Authentication check - admin only
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
                status: 401,
                headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Use service role for admin operations
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData?.user) {
            return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
                status: 401,
                headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        // Check if user is admin (stored in profiles.role as 'ADMIN')
        const { data: roleData } = await supabaseClient
            .from('profiles')
            .select('role')
            .eq('user_id', userData.user.id)
            .single();

        if (roleData?.role !== 'ADMIN') {
            return new Response(JSON.stringify({ error: 'Nur Admins können diese Funktion nutzen' }), {
                status: 403,
                headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
        if (!ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is not configured');
        }

        // Fetch all jobs with null or empty descriptions
        const { data: jobs, error: fetchError } = await supabaseClient
            .from('jobs')
            .select('*')
            .or('description.is.null,description.eq.');

        if (fetchError) {
            throw new Error(`Fehler beim Laden der Jobs: ${fetchError.message}`);
        }

        if (!jobs || jobs.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'Keine Jobs ohne Beschreibung gefunden',
                updated: 0
            }), {
                headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        console.log(`Backfilling descriptions for ${jobs.length} jobs...`);

        const results = {
            total: jobs.length,
            updated: 0,
            failed: 0,
            errors: [] as string[],
        };

        // Process jobs in batches to avoid rate limits
        for (const job of jobs) {
            try {
                // Build context from existing job data
                const context = [
                    job.title ? `Position: ${job.title}` : null,
                    job.hospital_name ? `Krankenhaus: ${job.hospital_name}` : null,
                    job.department ? `Abteilung: ${job.department}` : null,
                    job.location ? `Standort: ${job.location}` : null,
                    job.requirements ? `Anforderungen: ${job.requirements}` : null,
                    job.tags && job.tags.length > 0 ? `Tags: ${job.tags.join(', ')}` : null,
                ].filter(Boolean).join('\n');

                if (!context || context.trim().length < 20) {
                    console.log(`Skipping job ${job.id} - insufficient data`);
                    results.failed++;
                    results.errors.push(`Job ${job.id}: Nicht genug Daten für Zusammenfassung`);
                    continue;
                }

                // Generate AI summary
                const prompt = `Basierend auf diesen Informationen über eine Arztstelle, schreibe eine professionelle, einladende Zusammenfassung in 2-3 Sätzen auf Deutsch. Beschreibe kurz: Was für ein Krankenhaus/eine Klinik ist es, was sind die Hauptaufgaben, und was macht die Stelle attraktiv.

STELLENINFORMATIONEN:
${context}

Antworte NUR mit der Zusammenfassung, keine zusätzlichen Erklärungen.`;

                const aiResponse = await fetchAnthropicWithRetry('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-sonnet-4-6',
                        max_tokens: 300,
                        system: 'Du bist ein Experte für das Schreiben professioneller, einladender Stellenbeschreibungen für Ärzte in Deutschland. Schreibe prägnant und ansprechend.',
                        messages: [
                            { role: 'user', content: prompt }
                        ],
                    }),
                });

                if (!aiResponse.ok) {
                    const errorText = await aiResponse.text();
                    console.error(`AI error for job ${job.id}:`, aiResponse.status, errorText);
                    results.failed++;
                    results.errors.push(`Job ${job.id}: AI-Fehler ${aiResponse.status}`);
                    continue;
                }

                const aiData = await aiResponse.json();
                const description = aiData.content?.[0]?.text?.trim();

                if (!description || description.length < 10) {
                    console.log(`Skipping job ${job.id} - AI returned empty description`);
                    results.failed++;
                    results.errors.push(`Job ${job.id}: Leere AI-Antwort`);
                    continue;
                }

                // Update job with generated description
                const { error: updateError } = await supabaseClient
                    .from('jobs')
                    .update({ description })
                    .eq('id', job.id);

                if (updateError) {
                    console.error(`Update error for job ${job.id}:`, updateError);
                    results.failed++;
                    results.errors.push(`Job ${job.id}: Update-Fehler - ${updateError.message}`);
                    continue;
                }

                console.log(`✓ Updated job ${job.id}: ${job.title}`);
                results.updated++;

                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`Error processing job ${job.id}:`, error);
                results.failed++;
                results.errors.push(`Job ${job.id}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            ...results,
            message: `${results.updated} von ${results.total} Jobs aktualisiert`
        }), {
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Backfill error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        return new Response(JSON.stringify({ success: false, error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
    }
});

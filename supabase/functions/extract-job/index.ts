import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = (req: Request) => {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  const allowOrigin = !origin
    ? "*"
    : allowedOrigins.length === 0 || allowedOrigins.includes(origin)
      ? origin
      : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const { url, rawText } = await req.json();

    if (!url && !rawText) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL oder Text ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    let pageContent = rawText?.trim() || '';

    if (!pageContent) {
      if (!FIRECRAWL_API_KEY) {
        console.error('FIRECRAWL_API_KEY not configured');
        return new Response(
          JSON.stringify({
            success: false,
            error: 'URL-Auslesen ist nicht eingerichtet. Bitte fügen Sie den Text der Stellenanzeige unten ein oder geben Sie die Daten manuell ein.'
          }),
          { status: 503, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      // Format URL
      let formattedUrl = url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      // Scrape the job posting
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: formattedUrl,
          formats: ['markdown'],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResponse.json();

      if (!scrapeResponse.ok || !scrapeData.success) {
        console.error('Firecrawl error:', scrapeData);
        return new Response(
          JSON.stringify({ success: false, error: 'Stellenanzeige konnte nicht geladen werden. Bitte geben Sie die Daten manuell ein.' }),
          { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      pageContent = scrapeData.data?.markdown || '';
    }

    // Use AI to extract structured job data
    const extractionPrompt = `Analysiere diese Stellenanzeige und extrahiere die folgenden Informationen als JSON:

{
  "krankenhaus": "Name des Krankenhauses/der Klinik",
  "standort": "Stadt/Ort",
  "fachabteilung": "Abteilung/Fachbereich",
  "position": "Stellenbezeichnung",
  "ansprechpartner": "Name des Ansprechpartners (Chefarzt, Prof., HR etc.)",
  "anforderungen": "Kurze Zusammenfassung der wichtigsten Anforderungen (max 3 Sätze)"
}

Wenn ein Feld nicht gefunden werden kann, setze es auf null.

STELLENANZEIGE:
    ${pageContent.substring(0, 8000)}`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 700,
        system: 'Du extrahierst strukturierte Daten aus deutschen Stellenanzeigen für Ärzte. Antworte NUR mit validem JSON, keine Erklärungen.',
        messages: [
          { role: 'user', content: extractionPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI extraction error:', aiResponse.status, errorText);
      throw new Error('Extraktion fehlgeschlagen');
    }

    const aiData = await aiResponse.json();
    let extractedText = aiData.content?.[0]?.text || '{}';
    
    // Clean up JSON if wrapped in markdown
    extractedText = extractedText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    let jobData;
    try {
      jobData = JSON.parse(extractedText);
    } catch (e) {
      console.error('JSON parse error:', extractedText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Die Analyse hat kein verwertbares Ergebnis geliefert. Bitte geben Sie die Daten manuell ein.'
        }),
        { status: 422, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const hasAnyValue = Object.values(jobData || {}).some((value) => {
      if (value === null || value === undefined) return false;
      return String(value).trim().length > 0;
    });

    if (!hasAnyValue) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Es konnten keine relevanten Felder erkannt werden. Bitte prüfen Sie die Stellenanzeige oder füllen Sie die Felder manuell aus.'
        }),
        { status: 422, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: jobData,
      rawContent: pageContent.substring(0, 2000)
    }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error extracting job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

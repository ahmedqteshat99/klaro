import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const { url, rawText } = await req.json();

    if (!url && !rawText) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL oder Text ist erforderlich' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          JSON.stringify({ success: false, error: 'Firecrawl ist nicht konfiguriert' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        model: 'claude-sonnet-4-5',
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
      jobData = {
        krankenhaus: null,
        standort: null,
        fachabteilung: null,
        position: null,
        ansprechpartner: null,
        anforderungen: null
      };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: jobData,
      rawContent: pageContent.substring(0, 2000)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error extracting job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

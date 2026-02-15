import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, RATE_LIMITS, RateLimitError, rateLimitResponse } from "../_shared/rate-limit.ts";

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("https://")) return trimmed;
  // Users often paste `http://...` links; upgrade to HTTPS to satisfy SSRF protections.
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice("http://".length)}`;
  return `https://${trimmed}`;
};

/**
 * Validates URL to prevent SSRF (Server-Side Request Forgery) attacks
 * Blocks private IPs and enforces HTTPS
 */
const isValidJobUrl = (urlString: string): { valid: boolean; error?: string } => {
  if (!urlString || urlString.trim().length === 0) {
    return { valid: false, error: "URL ist leer" };
  }

  try {
    const parsed = new URL(urlString);

    // Only allow HTTPS (block HTTP and other protocols)
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: "Nur HTTPS-URLs sind erlaubt" };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost
    if (hostname === 'localhost' || hostname === '::1') {
      return { valid: false, error: "Localhost-URLs sind nicht erlaubt" };
    }

    // Block private IP ranges (IPv4)
    if (
      hostname.startsWith('127.') ||          // Loopback
      hostname.startsWith('10.') ||           // Private Class A
      hostname.startsWith('192.168.') ||      // Private Class C
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)  // Private Class B (172.16.0.0 - 172.31.255.255)
    ) {
      return { valid: false, error: "Private IP-Adressen sind nicht erlaubt" };
    }

    // Block link-local addresses
    if (hostname.startsWith('169.254.')) {
      return { valid: false, error: "Link-local-Adressen sind nicht erlaubt" };
    }

    // Block metadata service (AWS, GCP, Azure)
    if (hostname.includes('169.254.169.254') || hostname.includes('metadata')) {
      return { valid: false, error: "Metadata-Service-URLs sind nicht erlaubt" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Ungültige URL" };
  }
};

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
};

const toTags = (value: unknown): string[] | null => {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[;,]/g)
      : [];

  const normalized = list
    .map((entry) => (typeof entry === "string" ? entry.replace(/\s+/g, " ").trim() : ""))
    .filter(Boolean)
    .slice(0, 10);

  return normalized.length > 0 ? normalized : null;
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

    // Rate limiting check
    try {
      await enforceRateLimit(supabaseClient, userData.user.id, RATE_LIMITS.extract_job);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return rateLimitResponse(error, corsHeaders(req));
      }
      throw error;
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
    const normalizedInputUrl = typeof url === 'string' ? normalizeUrl(url) : '';

    // Validate URL for SSRF protection (if URL is provided)
    if (normalizedInputUrl && !rawText) {
      const urlValidation = isValidJobUrl(normalizedInputUrl);
      if (!urlValidation.valid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Ungültige URL: ${urlValidation.error}. Bitte verwenden Sie eine öffentliche HTTPS-URL.`
          }),
          { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }
    }

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

      // Scrape the job posting
      const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedInputUrl,
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
  "anforderungen": "Kurze Zusammenfassung der wichtigsten Anforderungen",
  "title": "Stellenbezeichnung für Admin-Form",
  "hospital_name": "Name des Krankenhauses/der Klinik",
  "department": "Abteilung/Fachbereich",
  "location": "Stadt/Ort",
  "description": "2-3 Sätze Zusammenfassung der Stelle. Beschreibe kurz: Was für ein Krankenhaus ist es, was sind die Hauptaufgaben, und was macht die Stelle attraktiv. Schreibe in professionellem, einladendem Ton auf Deutsch.",
  "requirements": "Zusammenfassung der Anforderungen",
  "contact_name": "Ansprechpartner",
  "contact_email": "Kontakt-E-Mail",
  "apply_url": "Direkter Bewerbungs-/Anzeigen-Link",
  "tags": ["Kurze Tags, z.B. Innere Medizin, Vollzeit"]
}

Wenn ein Feld nicht gefunden werden kann, setze es auf null.
Nutze bei "tags" ein Array mit maximal 6 Einträgen.
WICHTIG: Das Feld "description" MUSS eine aussagekräftige Zusammenfassung sein (2-3 Sätze), NICHT der vollständige Originaltext. Fasse die wichtigsten Aspekte der Stelle zusammen.
Antworte ausschließlich mit validem JSON.

QUELLE:
${normalizedInputUrl || "keine URL angegeben"}

STELLENANZEIGE:
    ${pageContent.substring(0, 10000)}`;

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 900,
        system: 'Du extrahierst strukturierte Daten aus deutschen Stellenanzeigen für Ärzte. Antworte NUR mit validem JSON, keine Erklärungen. Das Feld "description" soll eine kurze, professionelle Zusammenfassung der Stelle sein (2-3 Sätze), nicht der vollständige Originaltext.',
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

    const normalizedData = {
      krankenhaus: toNullableString(jobData?.krankenhaus ?? jobData?.hospital_name),
      standort: toNullableString(jobData?.standort ?? jobData?.location),
      fachabteilung: toNullableString(jobData?.fachabteilung ?? jobData?.department),
      position: toNullableString(jobData?.position ?? jobData?.title),
      ansprechpartner: toNullableString(jobData?.ansprechpartner ?? jobData?.contact_name),
      anforderungen: toNullableString(jobData?.anforderungen ?? jobData?.requirements),
      title: toNullableString(jobData?.title ?? jobData?.position),
      hospital_name: toNullableString(jobData?.hospital_name ?? jobData?.krankenhaus),
      department: toNullableString(jobData?.department ?? jobData?.fachabteilung),
      location: toNullableString(jobData?.location ?? jobData?.standort),
      description: toNullableString(jobData?.description),
      requirements: toNullableString(jobData?.requirements ?? jobData?.anforderungen),
      contact_name: toNullableString(jobData?.contact_name ?? jobData?.ansprechpartner),
      contact_email: toNullableString(jobData?.contact_email),
      apply_url: toNullableString(jobData?.apply_url ?? normalizedInputUrl),
      tags: toTags(jobData?.tags),
      // Source attribution for Fair Use compliance
      source_url: normalizedInputUrl || null,
      source_name: toNullableString(jobData?.hospital_name ?? jobData?.krankenhaus),
      scraped_at: new Date().toISOString(),
    };

    const hasAnyValue = Object.values(normalizedData).some((value) => {
      if (Array.isArray(value)) return value.length > 0;
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
      data: normalizedData,
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

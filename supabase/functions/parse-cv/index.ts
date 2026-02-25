import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

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

const normalizeArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];

const normalizeDate = (value: unknown): string | null => {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (/^(heute|present|current|aktuell)$/i.test(raw)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{2}\/\d{4}$/.test(raw)) {
    const [month, year] = raw.split("/");
    return `${year}-${month}-01`;
  }
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } =
      await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Nicht autorisiert" }), {
        status: 401,
        headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 50) {
      return new Response(
        JSON.stringify({ success: false, error: "Lebenslauf-Text ist erforderlich." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const extractionPrompt = `Extrahiere strukturierte Daten aus diesem Lebenslauf (deutsch oder englisch) und gib AUSSCHLIESSLICH validen JSON zurück.

Schema:
{
  "profile": {
    "vorname": string|null,
    "nachname": string|null,
    "email": string|null,
    "telefon": string|null,
    "stadt": string|null,
    "geburtsdatum": "YYYY-MM-DD"|null,
    "staatsangehoerigkeit": string|null,
    "familienstand": string|null,
    "fachrichtung": string|null,
    "approbationsstatus": string|null,
    "deutschniveau": string|null,
    "berufserfahrung_jahre": number|null,
    "medizinische_kenntnisse": string[]|null,
    "edv_kenntnisse": string[]|null,
    "sprachkenntnisse": string[]|null,
    "interessen": string|null
  },
  "workExperiences": [
    {
      "klinik": string,
      "station": string|null,
      "taetigkeiten": string|null,
      "zeitraum_von": "YYYY-MM-DD"|null,
      "zeitraum_bis": "YYYY-MM-DD"|null
    }
  ],
  "educationEntries": [
    {
      "universitaet": string,
      "abschluss": string|null,
      "abschlussarbeit": string|null,
      "zeitraum_von": "YYYY-MM-DD"|null,
      "zeitraum_bis": "YYYY-MM-DD"|null
    }
  ],
  "practicalExperiences": [
    {
      "einrichtung": string,
      "fachbereich": string|null,
      "beschreibung": string|null,
      "typ": string|null,
      "zeitraum_von": "YYYY-MM-DD"|null,
      "zeitraum_bis": "YYYY-MM-DD"|null
    }
  ],
  "certifications": [
    {
      "name": string,
      "aussteller": string|null,
      "datum": "YYYY-MM-DD"|null
    }
  ],
  "publications": [
    {
      "titel": string,
      "typ": string|null,
      "journal_ort": string|null,
      "datum": "YYYY-MM-DD"|null,
      "beschreibung": string|null
    }
  ],
  "unmatchedData": string[]
}

WICHTIGE KATEGORISIERUNGSREGELN:

1. certifications - Hierhin gehören ALLE Fortbildungen und Qualifikationen:
   - Fortbildungen, Weiterbildungen, Kurse, Workshops, Seminare
   - Zertifikate, Fachkunde, Zusatzbezeichnungen, Qualifikationen
   - CME-Punkte, Notfallkurse (ACLS, BLS, ATLS, etc.)
   - Strahlenschutzkurse, Hygieneschulungen
   - Jeder einzelne Kurs/Fortbildung als separater Eintrag!

2. publications - Hierhin gehören ALLE wissenschaftlichen Aktivitäten:
   - Kongresse, Konferenzen, Symposien (mit Teilnahme oder Vortrag)
   - Vorträge, Poster, Abstracts, Präsentationen
   - Publikationen, Paper, Artikel, Buchbeiträge
   - Doktorarbeit/Dissertation (typ: "Dissertation")
   - Forschungsprojekte, wissenschaftliche Mitarbeit

3. practicalExperiences - Praktische klinische Erfahrungen während der Ausbildung:
   - Famulaturen, Praktisches Jahr (PJ), Hospitationen
   - Praktika in Kliniken oder Praxen

4. workExperiences - Bezahlte Arbeitsverhältnisse als Arzt:
   - Assistenzarzt, Facharzt, Oberarzt Stellen
   - Ärztliche Tätigkeiten mit Arbeitsvertrag

5. unmatchedData - NUR als letzter Ausweg für:
   - Hobbys, Referenzen, Ehrenämter, Mitgliedschaften in Vereinen
   - NICHT für Fortbildungen, Kongresse oder wissenschaftliche Aktivitäten!

Allgemeine Regeln:
- Unbekannte Werte als null setzen.
- Datumsformat: ISO "YYYY-MM-DD" (bei Monat/Jahr den ersten Tag verwenden, z.B. 2020-05-01).
- sprachkenntnisse im Format "Deutsch (C1)" oder "Englisch (Muttersprache)".
- Priorisiere die Zuordnung zu bestehenden Kategorien. Verwende unmatchedData nur wenn keine andere Kategorie passt.
- Keine Erklärungen, kein Markdown, nur JSON.

LEBENSLAUF:
${text.substring(0, 12000)}`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system:
          "Du extrahierst strukturierte Daten aus Lebensläufen für Ärzte. Antworte NUR mit validem JSON entsprechend dem Schema.",
        messages: [{ role: "user", content: extractionPrompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI extraction error:", aiResponse.status, errorText);
      throw new Error("Extraktion fehlgeschlagen");
    }

    const aiData = await aiResponse.json();
    let extractedText = aiData.content?.[0]?.text || "{}";

    extractedText = extractedText
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(extractedText);
    } catch (error) {
      console.error("JSON parse error:", extractedText);
      parsed = {};
    }

    const profile = parsed.profile || {};

    const normalizeEntries = <T>(
      items: unknown,
      normalizer: (entry: any) => T | null
    ) =>
      Array.isArray(items)
        ? items.map(normalizer).filter(Boolean)
        : [];

    const data = {
      profile: {
        vorname: profile.vorname ?? null,
        nachname: profile.nachname ?? null,
        email: profile.email ?? null,
        telefon: profile.telefon ?? null,
        stadt: profile.stadt ?? null,
        geburtsdatum: normalizeDate(profile.geburtsdatum),
        staatsangehoerigkeit: profile.staatsangehoerigkeit ?? null,
        familienstand: profile.familienstand ?? null,
        fachrichtung: profile.fachrichtung ?? null,
        approbationsstatus: profile.approbationsstatus ?? null,
        deutschniveau: profile.deutschniveau ?? null,
        berufserfahrung_jahre:
          typeof profile.berufserfahrung_jahre === "number"
            ? profile.berufserfahrung_jahre
            : null,
        medizinische_kenntnisse: normalizeArray(profile.medizinische_kenntnisse),
        edv_kenntnisse: normalizeArray(profile.edv_kenntnisse),
        sprachkenntnisse: normalizeArray(profile.sprachkenntnisse),
        interessen: profile.interessen ?? null,
      },
      workExperiences: normalizeEntries(parsed.workExperiences, (entry) => {
        if (!entry || !entry.klinik) return null;
        return {
          klinik: String(entry.klinik).trim(),
          station: entry.station ?? null,
          taetigkeiten: entry.taetigkeiten ?? null,
          zeitraum_von: normalizeDate(entry.zeitraum_von),
          zeitraum_bis: normalizeDate(entry.zeitraum_bis),
        };
      }),
      educationEntries: normalizeEntries(parsed.educationEntries, (entry) => {
        if (!entry || !entry.universitaet) return null;
        return {
          universitaet: String(entry.universitaet).trim(),
          abschluss: entry.abschluss ?? null,
          abschlussarbeit: entry.abschlussarbeit ?? null,
          zeitraum_von: normalizeDate(entry.zeitraum_von),
          zeitraum_bis: normalizeDate(entry.zeitraum_bis),
        };
      }),
      practicalExperiences: normalizeEntries(parsed.practicalExperiences, (entry) => {
        if (!entry || !entry.einrichtung) return null;
        return {
          einrichtung: String(entry.einrichtung).trim(),
          fachbereich: entry.fachbereich ?? null,
          beschreibung: entry.beschreibung ?? null,
          typ: entry.typ ?? null,
          zeitraum_von: normalizeDate(entry.zeitraum_von),
          zeitraum_bis: normalizeDate(entry.zeitraum_bis),
        };
      }),
      certifications: normalizeEntries(parsed.certifications, (entry) => {
        if (!entry || !entry.name) return null;
        return {
          name: String(entry.name).trim(),
          aussteller: entry.aussteller ?? null,
          datum: normalizeDate(entry.datum),
        };
      }),
      publications: normalizeEntries(parsed.publications, (entry) => {
        if (!entry || !entry.titel) return null;
        return {
          titel: String(entry.titel).trim(),
          typ: entry.typ ?? null,
          journal_ort: entry.journal_ort ?? null,
          datum: normalizeDate(entry.datum),
          beschreibung: entry.beschreibung ?? null,
        };
      }),
      unmatchedData: normalizeArray(parsed.unmatchedData),
    };

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error parsing CV:", error);
    const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, RATE_LIMITS, RateLimitError, rateLimitResponse } from "../_shared/rate-limit.ts";

const normalizeEmailAddress = (value: string | null | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
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
      await enforceRateLimit(supabaseClient, userData.user.id, RATE_LIMITS.generate_anschreiben);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return rateLimitResponse(error, corsHeaders(req));
      }
      throw error;
    }

    const {
      profile: incomingProfile,
      workExperiences,
      educationEntries,
      practicalExperiences,
      certifications,
      publications,
      jobData,
    } = await req.json();
    let profile = incomingProfile;

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    const personalEmail = normalizeEmailAddress(profile?.email);
    let klaroEmail = normalizeEmailAddress(profile?.klaro_email);

    if (!klaroEmail) {
      const { data: provisionedEmail, error: provisionError } = await supabaseClient.rpc(
        "provision_user_alias",
        {
          p_user_id: userData.user.id,
          p_vorname: profile?.vorname ?? "",
          p_nachname: profile?.nachname ?? "",
        }
      );

      if (!provisionError && typeof provisionedEmail === "string") {
        klaroEmail = normalizeEmailAddress(provisionedEmail);
      }

      if (!klaroEmail) {
        const { data: refreshedProfile } = await supabaseClient
          .from("profiles")
          .select("klaro_email")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        klaroEmail = normalizeEmailAddress(refreshedProfile?.klaro_email);
      }
    }

    if (!klaroEmail) {
      throw new Error("Klaro E-Mail konnte nicht erstellt werden.");
    }

    if (profile) {
      profile = { ...profile, klaro_email: klaroEmail };
    }

    // Build applicant context
    const applicantInfo: string[] = [];

    if (profile) {
      const jahre = profile.berufserfahrung_jahre || 0;
      const monate = profile.berufserfahrung_monate || 0;
      let erfahrungText = '';
      if (jahre > 0 && monate > 0) {
        erfahrungText = `${jahre} Jahre ${monate} Monate`;
      } else if (jahre > 0) {
        erfahrungText = `${jahre} Jahre`;
      } else if (monate > 0) {
        erfahrungText = `${monate} Monate`;
      } else {
        erfahrungText = '0 Jahre';
      }

      applicantInfo.push(`BEWERBER:
- Name: ${profile.vorname} ${profile.nachname}
- Stadt: ${profile.stadt || 'nicht angegeben'}
- E-Mail: ${personalEmail || klaroEmail}
- Telefon: ${profile.telefon || 'nicht angegeben'}
- Fachrichtung: ${profile.fachrichtung || 'nicht angegeben'}
- Approbationsstatus: ${profile.approbationsstatus || 'nicht angegeben'}
- Deutschniveau: ${profile.deutschniveau || 'nicht angegeben'}
- Berufserfahrung: ${erfahrungText}
- Medizinische Kenntnisse: ${(profile.medizinische_kenntnisse || []).join(', ') || 'keine'}
- Interessen: ${profile.interessen || 'keine'}`);
    }

    if (workExperiences && workExperiences.length > 0) {
      const expList = workExperiences.slice(0, 3).map((w: any) => 
        `- ${w.klinik}: ${w.station || ''} (${w.taetigkeiten || ''})`
      ).join('\n');
      applicantInfo.push(`RELEVANTE BERUFSERFAHRUNG:\n${expList}`);
    }

    if (educationEntries && educationEntries.length > 0) {
      const eduList = educationEntries.slice(0, 2).map((e: any) =>
        `- ${e.universitaet}: ${e.abschluss || ''}`
      ).join('\n');
      applicantInfo.push(`AUSBILDUNG:\n${eduList}`);
    }

    if (practicalExperiences && practicalExperiences.length > 0) {
      const pracList = practicalExperiences.slice(0, 3).map((p: any) =>
        `- ${p.typ || 'Praktikum'} bei ${p.einrichtung} (${p.fachbereich || ''})`
      ).join('\n');
      applicantInfo.push(`PRAKTISCHE ERFAHRUNG:\n${pracList}`);
    }

    const applicantContext = applicantInfo.join('\n\n');

    // Build job context
    const jobContext = `STELLENANGEBOT:
- Krankenhaus: ${jobData.krankenhaus || 'nicht angegeben'}
- Standort: ${jobData.standort || 'nicht angegeben'}
- Fachabteilung: ${jobData.fachabteilung || 'nicht angegeben'}
- Position: ${jobData.position || 'Assistenzarzt'}
- Ansprechpartner: ${jobData.ansprechpartner || 'nicht angegeben'}
- Anforderungen: ${jobData.anforderungen || 'nicht angegeben'}`;

    const systemPrompt = `Du bist ein professioneller deutscher Bewerbungsschreiben-Generator für Ärzte.

REGELN:
1. Formaler deutscher Krankenhausstil
2. Personalisiert auf Krankenhaus und Abteilung
3. Verwende die echte Erfahrung des Bewerbers
4. Beziehe dich auf die Stellenanforderungen
5. Erfinde KEINE Fakten
6. Wenn Ansprechpartner fehlt → "Sehr geehrte Damen und Herren"
7. Wenn Ansprechpartner vorhanden → "Sehr geehrte(r) Herr/Frau [Name]" oder bei Prof. → "Sehr geehrter Herr Professor [Name]"
8. Ausgabe als sauberer HTML-Body OHNE Markdown, keine Code-Fences, kein <html>, <head>, <style>
9. Erlaubte Tags: p, strong, br, div
10. Struktur: Briefkopf (zweispaltig), Betreff (fett), Anrede, Einleitung, Hauptteil (Motivation, Qualifikationen), Schluss, Grußformel
11. Länge: ca. 250-350 Wörter
12. Verwende als Absender-E-Mail exakt die Klaro-E-Mail aus den Bewerberdaten.

LAYOUT-ANWEISUNGEN:
- Briefkopf als zweispaltiges Layout mit Flexbox:
  <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
    <div style="flex: 1;"><!-- Absender: Name, Adresse, Tel, E-Mail --></div>
    <div style="flex: 1; text-align: right;"><!-- Empfänger: Klinik, Abteilung, Ansprechpartner --></div>
  </div>
- Datum rechtsbündig nach dem Briefkopf als Platzhalter, exakt so:
  <p style="text-align: right;">{{DATE}}</p>
- Betreff MUSS fett formatiert sein: <p><strong>Betreff: Bewerbung als [Position] in der [Abteilung]</strong></p>
- Ausreichend Abstand zwischen Abschnitten

Beginne DIREKT mit dem HTML-Output.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1200,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Erstelle ein professionelles Anschreiben basierend auf diesen Daten:\n\n${applicantContext}\n\n${jobContext}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate-Limit überschritten, bitte versuchen Sie es später erneut.' }), {
          status: 429,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Guthaben erschöpft. Bitte laden Sie Ihr Konto auf.' }), {
          status: 402,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway Fehler: ${response.status}`);
    }

    const data = await response.json();
    const htmlContent = data.content?.[0]?.text || '';

    const formatGermanDate = (date: Date) =>
      new Intl.DateTimeFormat("de-DE", {
        timeZone: "Europe/Berlin",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);

    // Clean up any markdown code fences if present
    let cleanHtml = htmlContent
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    const generatedDate = formatGermanDate(new Date());
    let finalHtml = cleanHtml;
    if (finalHtml.includes("{{DATE}}")) {
      finalHtml = finalHtml.replaceAll("{{DATE}}", generatedDate);
    } else {
      finalHtml = finalHtml.replace(/\b\d{1,2}\.\d{1,2}\.\d{4}\b/, generatedDate);
    }

    // Ensure klaro email is replaced with personal email if both exist
    if (personalEmail && klaroEmail && personalEmail !== klaroEmail) {
      finalHtml = finalHtml.split(klaroEmail).join(personalEmail);
    }

    return new Response(JSON.stringify({ success: true, html: finalHtml }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating cover letter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

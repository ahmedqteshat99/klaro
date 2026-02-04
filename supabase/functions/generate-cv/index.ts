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
    const { profile, workExperiences, educationEntries, practicalExperiences, certifications, publications } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    // Build context from user data
    const sections: string[] = [];

    if (profile) {
      sections.push(`PERSÖNLICHE DATEN:
- Name: ${profile.vorname} ${profile.nachname}
- Geburtsdatum: ${profile.geburtsdatum || 'nicht angegeben'}
- Staatsangehörigkeit: ${profile.staatsangehoerigkeit || 'nicht angegeben'}
- Familienstand: ${profile.familienstand || 'nicht angegeben'}
- Stadt: ${profile.stadt || 'nicht angegeben'}
- E-Mail: ${profile.email || 'nicht angegeben'}
- Telefon: ${profile.telefon || 'nicht angegeben'}
- Fachrichtung: ${profile.fachrichtung || 'nicht angegeben'}
- Approbationsstatus: ${profile.approbationsstatus || 'nicht angegeben'}
- Deutschniveau: ${profile.deutschniveau || 'nicht angegeben'}
- Berufserfahrung: ${profile.berufserfahrung_jahre || 0} Jahre
- Medizinische Kenntnisse: ${(profile.medizinische_kenntnisse || []).join(', ') || 'keine'}
- EDV-Kenntnisse: ${(profile.edv_kenntnisse || []).join(', ') || 'keine'}
- Sprachkenntnisse: ${(profile.sprachkenntnisse || []).join(', ') || 'keine'}
- Interessen: ${profile.interessen || 'keine'}`);
    }

    if (workExperiences && workExperiences.length > 0) {
      const expList = workExperiences.map((w: any) => 
        `- ${w.klinik} (${w.zeitraum_von || '?'} - ${w.zeitraum_bis || 'heute'}): ${w.station || ''} ${w.taetigkeiten || ''}`
      ).join('\n');
      sections.push(`BERUFSERFAHRUNG:\n${expList}`);
    }

    if (educationEntries && educationEntries.length > 0) {
      const eduList = educationEntries.map((e: any) =>
        `- ${e.universitaet} (${e.zeitraum_von || '?'} - ${e.zeitraum_bis || '?'}): ${e.abschluss || ''} ${e.abschlussarbeit ? `- Arbeit: ${e.abschlussarbeit}` : ''}`
      ).join('\n');
      sections.push(`AUSBILDUNG:\n${eduList}`);
    }

    if (practicalExperiences && practicalExperiences.length > 0) {
      const pracList = practicalExperiences.map((p: any) =>
        `- ${p.typ || 'Praktikum'} bei ${p.einrichtung} (${p.zeitraum_von || '?'} - ${p.zeitraum_bis || '?'}): ${p.fachbereich || ''} ${p.beschreibung || ''}`
      ).join('\n');
      sections.push(`PRAKTISCHE ERFAHRUNG:\n${pracList}`);
    }

    if (certifications && certifications.length > 0) {
      const certList = certifications.map((c: any) =>
        `- ${c.name} (${c.datum || '?'}): ${c.aussteller || ''}`
      ).join('\n');
      sections.push(`FORTBILDUNGEN & ZERTIFIKATE:\n${certList}`);
    }

    if (publications && publications.length > 0) {
      const pubList = publications.map((p: any) =>
        `- ${p.typ || 'Publikation'}: ${p.titel} (${p.datum || '?'}) ${p.journal_ort || ''}`
      ).join('\n');
      sections.push(`WISSENSCHAFT & PUBLIKATIONEN:\n${pubList}`);
    }

    const userDataContext = sections.join('\n\n');

    const systemPrompt = `Du bist ein professioneller deutscher Lebenslauf-Generator für Ärzte, die sich als Assistenzarzt in Deutschland bewerben.

WICHTIG: Erstelle einen PROFESSIONELLEN deutschen Lebenslauf nach dem Standard für Assistenzarzt-Bewerbungen.

═══════════════════════════════════════════════════════════════════
HTML-STRUKTUR UND CSS-KLASSEN (STRIKT BEFOLGEN)
═══════════════════════════════════════════════════════════════════

ZWEISPALTEN-LAYOUT für Erfahrungen:
Verwende für JEDEN Eintrag bei Berufserfahrung, Ausbildung und Praktika diese Struktur:

<div class="cv-entry">
  <div class="cv-date">MM/YYYY – MM/YYYY</div>
  <div class="cv-content">
    <h3>Jobtitel / Position</h3>
    <p><strong>Klinikname / Institution</strong>, Ort</p>
    <ul>
      <li>Kurze Tätigkeit 1</li>
      <li>Kurze Tätigkeit 2</li>
    </ul>
  </div>
</div>

═══════════════════════════════════════════════════════════════════
ABSCHNITTS-REIHENFOLGE (NUR WENN DATEN VORHANDEN)
═══════════════════════════════════════════════════════════════════

1. <h2>PERSÖNLICHE DATEN</h2>
   - Einfache Liste: Name, Geburtsdatum, Staatsangehörigkeit, Familienstand, Kontakt
   - KEIN Foto-Platzhalter (wird vom Frontend hinzugefügt)

2. <h2>PROFIL</h2>
   KRITISCH: Maximal 3-4 KURZE Sätze!
   - Nur Fakten: Fachrichtung, Jahre Erfahrung, Schwerpunkte, Approbation
   - KEINE langen Prosa-Texte oder KI-Sprache
   - Beispiel: "Assistenzarzt Innere Medizin mit 3 Jahren Berufserfahrung. Schwerpunkte: Kardiologie und Notfallmedizin. Deutsche Approbation, Deutschkenntnisse C1."

3. <h2>BERUFSERFAHRUNG</h2>
   - Neueste zuerst (antichronologisch)
   - Verwende cv-entry Layout (siehe oben)
   - Bullet-Points: Kurze Verb-Phrasen (3-8 Wörter max)
   - Beispiele: "Patientenaufnahme und Anamnese", "EKG-Auswertung", "ZVK-Anlage"

4. <h2>AUSBILDUNG</h2>
   - Verwende cv-entry Layout
   - Universität, Abschluss, Zeitraum

5. <h2>PRAKTISCHE ERFAHRUNG</h2>
   - PJ, Famulatur, Hospitationen
   - Verwende cv-entry Layout

6. <h2>FORTBILDUNGEN & ZERTIFIKATE</h2>
   FORMAT (als Bullet-Liste):
   <ul class="cv-certs">
     <li>YYYY – Zertifikatsname – Aussteller</li>
   </ul>

7. <h2>PUBLIKATIONEN</h2>
   FORMAT (strukturierte Liste):
   <ul class="cv-publications">
     <li>YYYY – Titel der Studie – Journal Name – DOI: xxx</li>
   </ul>

8. <h2>KENNTNISSE</h2>
   Aufteilen in:
   <h3>Medizinische Kenntnisse</h3>
   <ul><li>Kenntniss 1</li>...</ul>
   <h3>EDV-Kenntnisse</h3>
   <ul><li>Kenntniss 1</li>...</ul>

9. <h2>SPRACHEN</h2>
   FORMAT (Tabelle):
   <table class="cv-languages">
     <tr><td>Deutsch</td><td>C1</td><td>fließend</td></tr>
     <tr><td>Englisch</td><td>B2</td><td>gut</td></tr>
   </table>

10. <h2>INTERESSEN</h2>
    - Nur wenn angegeben, kurze Liste

═══════════════════════════════════════════════════════════════════
STRIKTE REGELN (NIEMALS BRECHEN)
═══════════════════════════════════════════════════════════════════

✗ VERBOTEN:
- Lange Sätze (max 15 Wörter pro Bullet)
- KI-Phrasen wie "umfangreiche Erfahrung", "verantwortungsbewusst"
- Dekorative Icons, Emojis oder Symbole
- Akademische Sprache oder vollständige Sätze in Bullets
- Markdown-Formatierung (nur HTML!)
- <html>, <head>, <body>, <style> Tags
- Erfundene Daten

✓ ERFORDERLICH:
- Nur sauberes semantisches HTML
- CSS-Klassen: cv-entry, cv-date, cv-content, cv-languages, cv-publications, cv-certs
- <h2> für Abschnittsüberschriften (GROSSBUCHSTABEN)
- <h3> für Untertitel (Position/Jobtitel)
- <strong> für wichtige Begriffe (Klinikname)
- Kurze, aktionsorientierte Bullet-Points

═══════════════════════════════════════════════════════════════════
BEISPIEL-OUTPUT
═══════════════════════════════════════════════════════════════════

<h2>PERSÖNLICHE DATEN</h2>
<p><strong>Dr. Max Mustermann</strong></p>
<p>Geboren: 15.03.1990 in Berlin | Staatsangehörigkeit: Deutsch | Familienstand: Ledig</p>
<p>Musterstraße 1, 12345 Berlin | Tel: 0151-12345678 | E-Mail: max@beispiel.de</p>

<h2>PROFIL</h2>
<p>Assistenzarzt in Weiterbildung Innere Medizin mit 3 Jahren Berufserfahrung. Schwerpunkte: Kardiologie und Notfallmedizin. Deutsche Approbation, Deutschkenntnisse C1.</p>

<h2>BERUFSERFAHRUNG</h2>
<div class="cv-entry">
  <div class="cv-date">01/2023 – heute</div>
  <div class="cv-content">
    <h3>Assistenzarzt Innere Medizin</h3>
    <p><strong>Universitätsklinikum Hamburg-Eppendorf</strong>, Hamburg</p>
    <ul>
      <li>Patientenaufnahme und Anamnese</li>
      <li>Diagnostik: EKG, Echokardiographie</li>
      <li>ZVK- und Pleurapunktion</li>
      <li>Teilnahme am Bereitschaftsdienst</li>
    </ul>
  </div>
</div>

<h2>SPRACHEN</h2>
<table class="cv-languages">
  <tr><td>Deutsch</td><td>C1</td><td>fließend</td></tr>
  <tr><td>Englisch</td><td>B2</td><td>gut</td></tr>
</table>

Beginne DIREKT mit dem HTML-Output. Keine Einleitung oder Erklärung.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2400,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Erstelle einen professionellen deutschen Lebenslauf basierend auf diesen Daten:\n\n${userDataContext}`
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate-Limit überschritten, bitte versuchen Sie es später erneut.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Guthaben erschöpft. Bitte laden Sie Ihr Konto auf.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway Fehler: ${response.status}`);
    }

    const data = await response.json();
    const htmlContent = data.content?.[0]?.text || '';

    // Clean up any markdown code fences if present
    let cleanHtml = htmlContent
      .replace(/```html\n?/gi, '')
      .replace(/```\n?/g, '')
      .trim();

    const medicalSkills = (profile?.medizinische_kenntnisse || []).filter(Boolean);
    const edvSkills = (profile?.edv_kenntnisse || []).filter(Boolean);
    const buildList = (items: string[]) =>
      `<ul>${(items.length ? items : ["Keine Angaben"]).map((item) => `<li>${item}</li>`).join("")}</ul>`;

    const knowledgeSection = `
<h2>KENNTNISSE</h2>
<h3>Medizinische Kenntnisse</h3>
${buildList(medicalSkills)}
<h3>EDV-Kenntnisse</h3>
${buildList(edvSkills)}
`.trim();

    const hasKnowledge = /<h2>\s*KENNTNISSE\s*<\/h2>/i.test(cleanHtml);
    const hasMed = /Medizinische Kenntnisse/i.test(cleanHtml);
    const hasEdv = /EDV-Kenntnisse/i.test(cleanHtml);

    if (!hasKnowledge) {
      cleanHtml = `${cleanHtml}\n${knowledgeSection}`;
    } else if (!hasMed || !hasEdv) {
      let fallback = "";
      if (!hasMed) {
        fallback += `\n<h3>Medizinische Kenntnisse</h3>\n${buildList(medicalSkills)}`;
      }
      if (!hasEdv) {
        fallback += `\n<h3>EDV-Kenntnisse</h3>\n${buildList(edvSkills)}`;
      }
      cleanHtml = `${cleanHtml}\n${fallback.trim()}`;
    }

    return new Response(JSON.stringify({ success: true, html: cleanHtml }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating CV:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

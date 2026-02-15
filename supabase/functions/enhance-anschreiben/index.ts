import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, RATE_LIMITS, RateLimitError, rateLimitResponse } from "../_shared/rate-limit.ts";

interface Message {
  role: "user" | "assistant";
  content: string;
}

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
      currentHtml,
      userMessage,
      conversationHistory = [],
    } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    if (!userMessage || typeof userMessage !== 'string') {
      throw new Error('User message ist erforderlich');
    }

    // System prompt for enhancement
    const systemPrompt = `Du bist ein Experte für deutsche Bewerbungsanschreiben im medizinischen Bereich.

AUFGABE:
Der Benutzer hat ein Anschreiben und möchte es verbessern. Du erhältst:
1. Das aktuelle Anschreiben als HTML
2. Die Anfrage des Benutzers zur Verbesserung

REGELN:
1. Verstehe GENAU was der Benutzer möchte (formaler, kürzer, mehr Betonung auf X, etc.)
2. Wenn kein HTML vorhanden ist, erstelle ein professionelles Anschreiben basierend auf den Anweisungen
3. Behalte die HTML-Struktur bei (verwende nur: p, strong, br, div mit inline styles)
4. Behalte den professionellen deutschen Krankenhausstil bei
5. Verändere NUR die Aspekte, die der Benutzer erwähnt hat
6. Wenn der Benutzer nur eine Frage stellt oder Rat sucht, antworte im Gespräch (ohne HTML)
7. Wenn der Benutzer eine konkrete Änderung möchte, antworte MIT dem verbesserten HTML

AUSGABEFORMAT:
- Wenn du HTML generierst, beginne mit: <html_output>...</html_output>
- Wenn du nur im Gespräch antwortest (Fragen, Vorschläge), antworte normal ohne diese Tags
- Datum-Platzhalter: Verwende {{DATE}} für das Datum
- Verwende deutsche formale Anrede und Stil

BEISPIELE:
User: "Mach es formaler"
→ Ausgabe: <html_output>[verbessertes HTML]</html_output>

User: "Was sollte ich noch hinzufügen?"
→ Ausgabe: "Ich würde empfehlen, ..." (keine HTML-Tags)

User: "Kürze es auf eine Seite"
→ Ausgabe: <html_output>[gekürztes HTML]</html_output>`;

    // Build messages array
    const messages: Message[] = [];

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message with context
    let userContent = userMessage;
    if (currentHtml) {
      userContent = `Aktuelles Anschreiben (HTML):\n\n${currentHtml}\n\n---\n\nMeine Anfrage: ${userMessage}`;
    }

    messages.push({
      role: "user",
      content: userContent,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        system: systemPrompt,
        messages,
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
    const assistantMessage = data.content?.[0]?.text || '';

    // Check if response contains HTML output
    const htmlMatch = assistantMessage.match(/<html_output>([\s\S]*?)<\/html_output>/);

    let updatedHtml: string | null = null;
    let conversationalResponse = assistantMessage;

    if (htmlMatch) {
      // Extract and clean HTML
      updatedHtml = htmlMatch[1]
        .replace(/```html\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();

      // Remove the html_output tags from conversational response
      conversationalResponse = assistantMessage
        .replace(/<html_output>[\s\S]*?<\/html_output>/g, '')
        .trim();

      // If no conversational text remains, provide a default
      if (!conversationalResponse) {
        conversationalResponse = "Ich habe das Anschreiben wie gewünscht angepasst.";
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: conversationalResponse,
      updatedHtml,
    }), {
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error enhancing Anschreiben:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://cdn.skypack.dev/pdf-lib@1.17.1?dts";
import { corsHeaders } from "../_shared/cors.ts";
import { enforceRateLimit, RATE_LIMITS, RateLimitError, rateLimitResponse } from "../_shared/rate-limit.ts";

interface MergeRequest {
  applicationId: string;
  hospitalName?: string;
  nachname?: string;
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
      await enforceRateLimit(supabaseClient, userData.user.id, RATE_LIMITS.merge_pdfs);
    } catch (error) {
      if (error instanceof RateLimitError) {
        return rateLimitResponse(error, corsHeaders(req));
      }
      throw error;
    }

    const { applicationId, hospitalName, nachname }: MergeRequest = await req.json();

    if (!applicationId) {
      return new Response(JSON.stringify({ error: 'applicationId ist erforderlich' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Verify application belongs to user
    const { data: application, error: appError } = await supabaseClient
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (appError || !application) {
      return new Response(JSON.stringify({ error: 'Bewerbung nicht gefunden' }), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Fetch all attachments for this application
    const { data: attachments, error: attachmentsError } = await supabaseClient
      .from('application_attachments')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (attachmentsError || !attachments || attachments.length === 0) {
      return new Response(JSON.stringify({ error: 'Keine Anhänge gefunden' }), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Create a new PDF document for merging
    const mergedPdf = await PDFDocument.create();

    // Download and merge each PDF in order
    for (const attachment of attachments) {
      try {
        const { data: pdfBlob, error: downloadError } = await supabaseClient
          .storage
          .from('user-files')
          .download(attachment.file_path);

        if (downloadError || !pdfBlob) {
          console.error(`Failed to download ${attachment.file_path}:`, downloadError);
          continue;
        }

        // Convert blob to ArrayBuffer
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();

        // Load the PDF
        const pdf = await PDFDocument.load(pdfArrayBuffer);

        // Copy all pages from this PDF to the merged PDF
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      } catch (error) {
        console.error(`Error processing ${attachment.file_path}:`, error);
        // Continue with other attachments even if one fails
      }
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();

    // Generate filename: nachname_hospitalname.pdf
    const sanitizeFileName = (str: string) =>
      str.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');

    const filenameParts = [];
    if (nachname) filenameParts.push(sanitizeFileName(nachname));
    if (hospitalName) filenameParts.push(sanitizeFileName(hospitalName));

    const filename = filenameParts.length > 0
      ? `${filenameParts.join('_')}.pdf`
      : `Bewerbung_${applicationId.slice(0, 8)}.pdf`;

    // Return the merged PDF as a blob
    return new Response(mergedPdfBytes, {
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Merge error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler beim Zusammenführen'
    }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

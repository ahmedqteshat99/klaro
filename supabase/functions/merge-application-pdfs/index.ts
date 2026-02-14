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
    const processingErrors: string[] = [];
    let successfulMerges = 0;

    console.log(`Starting merge of ${attachments.length} attachments for application ${applicationId}`);

    // Download and merge each PDF in order
    for (let i = 0; i < attachments.length; i++) {
      const attachment = attachments[i];
      try {
        console.log(`Processing attachment ${i + 1}/${attachments.length}: ${attachment.file_name || attachment.file_path}`);

        const { data: pdfBlob, error: downloadError } = await supabaseClient
          .storage
          .from('user-files')
          .download(attachment.file_path);

        if (downloadError || !pdfBlob) {
          const errorMsg = `Failed to download ${attachment.file_name}: ${downloadError?.message || 'No data'}`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }

        // Convert blob to ArrayBuffer
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();

        if (pdfArrayBuffer.byteLength === 0) {
          const errorMsg = `File ${attachment.file_name} is empty`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }

        console.log(`Loading PDF (${pdfArrayBuffer.byteLength} bytes): ${attachment.file_name}`);

        // Load the PDF with error handling
        const pdf = await PDFDocument.load(pdfArrayBuffer, {
          ignoreEncryption: true,
          updateMetadata: false
        });

        const pageCount = pdf.getPageCount();
        console.log(`PDF loaded: ${pageCount} pages`);

        if (pageCount === 0) {
          const errorMsg = `File ${attachment.file_name} has no pages`;
          console.error(errorMsg);
          processingErrors.push(errorMsg);
          continue;
        }

        // Copy all pages from this PDF to the merged PDF
        const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });

        successfulMerges++;
        console.log(`Successfully merged ${attachment.file_name} (${pageCount} pages)`);
      } catch (error) {
        const errorMsg = `Error processing ${attachment.file_name}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(errorMsg);
        processingErrors.push(errorMsg);
        // Continue with other attachments even if one fails
      }
    }

    console.log(`Merge complete: ${successfulMerges}/${attachments.length} files merged successfully`);

    if (successfulMerges === 0) {
      return new Response(JSON.stringify({
        error: 'Keine PDFs konnten zusammengeführt werden',
        details: processingErrors,
      }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    if (processingErrors.length > 0) {
      console.warn('Some files had errors:', processingErrors);
    }

    // Save the merged PDF with options to preserve quality
    console.log('Saving merged PDF...');
    const mergedPdfBytes = await mergedPdf.save({
      useObjectStreams: false, // Better compatibility
      addDefaultPage: false,
      objectsPerTick: 50,
    });

    console.log(`Merged PDF size: ${mergedPdfBytes.length} bytes`);

    if (mergedPdfBytes.length === 0) {
      return new Response(JSON.stringify({
        error: 'Generierte PDF ist leer',
        details: processingErrors,
      }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Generate filename: nachname_hospitalname.pdf
    const sanitizeFileName = (str: string) =>
      str.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');

    const filenameParts = [];
    if (nachname) filenameParts.push(sanitizeFileName(nachname));
    if (hospitalName) filenameParts.push(sanitizeFileName(hospitalName));

    const filename = filenameParts.length > 0
      ? `${filenameParts.join('_')}.pdf`
      : `Bewerbung_${applicationId.slice(0, 8)}.pdf`;

    console.log(`Returning merged PDF: ${filename}`);

    // Return the merged PDF as a blob
    return new Response(mergedPdfBytes, {
      headers: {
        ...corsHeaders(req),
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(mergedPdfBytes.length),
      },
    });

  } catch (error) {
    console.error('Merge error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error('Error stack:', errorStack);

    return new Response(JSON.stringify({
      error: errorMessage,
      details: errorStack ? errorStack.split('\n').slice(0, 3).join('\n') : undefined,
    }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

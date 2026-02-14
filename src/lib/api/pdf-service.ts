import { supabase } from "@/integrations/supabase/client";

const PDF_SERVICE_URL = import.meta.env.VITE_PDF_SERVICE_URL;

export interface ServerPdfParams {
    type: "cv" | "anschreiben";
    htmlContent: string;
    showFoto?: boolean;
    fotoUrl?: string | null;
    showSignatur?: boolean;
    signaturUrl?: string | null;
    stadt?: string | null;
    fileName?: string;
}

async function requestPdfBlob({
    type,
    htmlContent,
    showFoto,
    fotoUrl,
    showSignatur,
    signaturUrl,
    stadt,
}: ServerPdfParams): Promise<Blob> {
    if (!PDF_SERVICE_URL) {
        throw new Error("PDF Service URL is not configured (VITE_PDF_SERVICE_URL)");
    }

    // Get the current auth token
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
        throw new Error("Nicht angemeldet. Bitte melden Sie sich erneut an.");
    }

    let response: Response;
    try {
        response = await fetch(`${PDF_SERVICE_URL}/generate-pdf`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                type,
                htmlContent,
                showFoto,
                fotoUrl,
                showSignatur,
                signaturUrl,
                stadt,
            }),
        });
    } catch {
        throw new Error(
            `PDF-Service nicht erreichbar (${PDF_SERVICE_URL}). Bitte URL/Deployment pruefen.`
        );
    }

    if (!response.ok) {
        let errorMsg = "PDF-Erstellung fehlgeschlagen.";
        try {
            const errBody = await response.json();
            if (errBody.error) errorMsg = errBody.error;
        } catch {
            // ignore parse error
        }
        throw new Error(errorMsg);
    }

    return response.blob();
}

export async function generatePdfBlobFromServer(params: ServerPdfParams): Promise<Blob> {
    return requestPdfBlob(params);
}

/**
 * Download a PDF from the server-side Puppeteer service.
 * Sends the HTML content + options, receives a PDF binary, and triggers a file download.
 */
export async function downloadPdfFromServer(params: ServerPdfParams): Promise<void> {
    // Convert response to blob and trigger download
    const blob = await requestPdfBlob(params);
    const url = URL.createObjectURL(blob);

    const defaultFileName =
        params.type === "cv" ? "Lebenslauf.pdf" : "Anschreiben.pdf";
    const finalName = params.fileName || defaultFileName;

    // Use an anchor element to trigger the download.
    // On iOS Safari the `download` attribute is ignored — the PDF opens
    // inline in the same tab, where the user can share/save via the OS.
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

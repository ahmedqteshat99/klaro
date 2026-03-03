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
        throw new Error("SERVER_UNAVAILABLE");
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
        throw new Error("SERVER_UNAVAILABLE");
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

function triggerBlobDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 100);
}

/**
 * Download a PDF — tries the server-side Puppeteer service first,
 * falls back to client-side browser print if the server is unavailable.
 */
export async function downloadPdfFromServer(params: ServerPdfParams): Promise<void> {
    const defaultFileName =
        params.type === "cv" ? "Lebenslauf.pdf" : "Anschreiben.pdf";
    const finalName = params.fileName || defaultFileName;

    try {
        const blob = await requestPdfBlob(params);
        triggerBlobDownload(blob, finalName);
    } catch (err) {
        const isServerDown =
            err instanceof Error && err.message === "SERVER_UNAVAILABLE";

        if (!isServerDown) {
            throw err;
        }

        // Fallback: client-side PDF via browser print dialog
        console.warn("PDF server unavailable, falling back to client-side print export");
        const { exportToPDF } = await import("@/lib/pdf-export");
        await exportToPDF({
            htmlContent: params.htmlContent,
            fileName: finalName.replace(/\.pdf$/i, ""),
            showFoto: params.type === "cv" ? params.showFoto : false,
            fotoUrl: params.fotoUrl,
            showSignatur: params.showSignatur,
            signaturUrl: params.signaturUrl,
            stadt: params.stadt,
        });
    }
}

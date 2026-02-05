import { generateCVHtml } from "@/components/cv/CVTemplate";
import { exportToPDF as exportToPDFHtml2 } from "@/lib/export";

interface ExportToPDFParams {
  htmlContent: string;
  fileName: string;
  showFoto?: boolean;
  fotoUrl?: string | null;
  showSignatur?: boolean;
  signaturUrl?: string | null;
  stadt?: string | null;
}

export type PdfExportMode = "print" | "download";

const isMobileDevice = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const coarsePointer = typeof window.matchMedia === "function"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;
  const smallScreen = typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 768px)").matches
    : false;
  return uaMobile || (coarsePointer && smallScreen);
};

export const getPdfExportMode = (): PdfExportMode =>
  isMobileDevice() ? "download" : "print";

/**
 * Converts an image URL to a base64 data URL for reliable embedding
 */
async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Failed to convert image to data URL:", error);
    return null;
  }
}

/**
 * Waits for fonts to be ready
 */
async function waitForFonts(): Promise<void> {
  try {
    await document.fonts.ready;
    // Also try to load Spectral specifically
    await Promise.all([
      document.fonts.load('300 12pt Spectral'),
      document.fonts.load('600 12pt Spectral')
    ]);
  } catch (e) {
    console.warn("Font loading warning:", e);
  }
}

/**
 * Export CV to PDF using browser's native print functionality
 * This ensures the PDF matches the preview exactly
 */
export const exportToPDFNative = async ({
  htmlContent,
  fileName,
  showFoto = false,
  fotoUrl,
  showSignatur = false,
  signaturUrl,
  stadt
}: ExportToPDFParams): Promise<void> => {
  // Convert images to data URLs for reliable embedding
  let fotoDataUrl = fotoUrl;
  let signaturDataUrl = signaturUrl;

  if (showFoto && fotoUrl) {
    const dataUrl = await imageUrlToDataUrl(fotoUrl);
    if (dataUrl) fotoDataUrl = dataUrl;
  }

  if (showSignatur && signaturUrl) {
    const dataUrl = await imageUrlToDataUrl(signaturUrl);
    if (dataUrl) signaturDataUrl = dataUrl;
  }

  // Generate the full HTML document
  const fullHtml = generateCVHtml({
    htmlContent,
    showFoto,
    fotoUrl: fotoDataUrl,
    showSignatur,
    signaturUrl: signaturDataUrl,
    stadt
  });

  // Open in new window for printing
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    throw new Error('Could not open print window. Please allow popups.');
  }

  // Write the HTML to the new window
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  // Wait for content to load
  await new Promise<void>((resolve) => {
    printWindow.onload = () => resolve();
    // Fallback timeout
    setTimeout(resolve, 2000);
  });

  // Wait for fonts
  try {
    await printWindow.document.fonts.ready;
  } catch (e) {
    console.warn("Font loading in print window:", e);
  }

  // Wait for images to load
  const images = printWindow.document.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 3000);
      });
    })
  );

  // Small delay for final render
  await new Promise(resolve => setTimeout(resolve, 500));

  // Trigger print dialog
  printWindow.print();

  // Note: The window will stay open so user can see preview
  // They can close it after saving the PDF
};

/**
 * Export CV to PDF using a backend service (Playwright)
 * This requires a separate Node.js server or serverless function
 */
export const exportToPDFPlaywright = async ({
  htmlContent,
  fileName,
  showFoto = false,
  fotoUrl,
  showSignatur = false,
  signaturUrl,
  stadt
}: ExportToPDFParams): Promise<void> => {
  // Convert images to data URLs
  let fotoDataUrl = fotoUrl;
  let signaturDataUrl = signaturUrl;

  if (showFoto && fotoUrl) {
    const dataUrl = await imageUrlToDataUrl(fotoUrl);
    if (dataUrl) fotoDataUrl = dataUrl;
  }

  if (showSignatur && signaturUrl) {
    const dataUrl = await imageUrlToDataUrl(signaturUrl);
    if (dataUrl) signaturDataUrl = dataUrl;
  }

  // Generate the full HTML document
  const fullHtml = generateCVHtml({
    htmlContent,
    showFoto,
    fotoUrl: fotoDataUrl,
    showSignatur,
    signaturUrl: signaturDataUrl,
    stadt
  });

  // Call the PDF generation endpoint
  const response = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html: fullHtml,
      fileName
    })
  });

  if (!response.ok) {
    throw new Error('PDF generation failed');
  }

  // Download the PDF
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Main export function - uses native print by default
 * Can be switched to Playwright backend when available
 */
export const exportToPDF = async (params: ExportToPDFParams): Promise<PdfExportMode> => {
  const preferredMode = getPdfExportMode();

  if (preferredMode === "print") {
    try {
      await exportToPDFNative(params);
      return "print";
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/popup|pop-up/i.test(message)) {
        await exportToPDFHtml2(
          params.htmlContent,
          params.fileName,
          params.showFoto,
          params.fotoUrl,
          params.showSignatur,
          params.signaturUrl,
          params.stadt
        );
        return "download";
      }
      throw error;
    }
  }

  await exportToPDFHtml2(
    params.htmlContent,
    params.fileName,
    params.showFoto,
    params.fotoUrl,
    params.showSignatur,
    params.signaturUrl,
    params.stadt
  );
  return "download";
};

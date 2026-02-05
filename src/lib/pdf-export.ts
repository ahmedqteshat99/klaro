import { generateCVHtml } from "@/components/cv/CVTemplate";
import { exportToPDF as exportToPDFHtml2, type PdfDownloadMode } from "@/lib/export";

interface ExportToPDFParams {
  htmlContent: string;
  fileName: string;
  showFoto?: boolean;
  fotoUrl?: string | null;
  showSignatur?: boolean;
  signaturUrl?: string | null;
  stadt?: string | null;
  printWindow?: Window | null;
}

export type PdfExportMode = "print" | PdfDownloadMode;

const isMobileDevice = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIpad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const uaMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || isIpad;
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

function createHtmlBlobUrl(html: string): string {
  const blob = new Blob([html], { type: "text/html" });
  return URL.createObjectURL(blob);
}

function createPrintFrame(html: string): HTMLIFrameElement {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.visibility = "hidden";
  frame.setAttribute("aria-hidden", "true");
  frame.srcdoc = html;
  document.body.appendChild(frame);
  return frame;
}

function createPrintWindow(): Window | null {
  if (typeof window === "undefined") return null;
  try {
    const win = window.open("about:blank", "_blank");
    if (win) {
      try {
        win.opener = null;
      } catch {
        // Ignore opener assignment errors
      }
      try {
        win.document.title = "PDF Vorschau";
        win.document.body.innerHTML = "<p style=\"font-family: sans-serif; padding: 1rem;\">PDF wird vorbereitet…</p>";
      } catch {
        // Ignore document access errors
      }
    }
    return win;
  } catch (error) {
    console.warn("Could not open print window:", error);
    return null;
  }
}

async function waitForFrameLoad(frame: HTMLIFrameElement): Promise<void> {
  await new Promise<void>((resolve) => {
    if (frame.contentDocument?.readyState === "complete") {
      resolve();
      return;
    }
    frame.addEventListener("load", () => resolve(), { once: true });
    setTimeout(resolve, 3000);
  });
}

async function waitForWindowLoad(printWindow: Window): Promise<void> {
  await new Promise<void>((resolve) => {
    const doc = printWindow.document;
    if (doc.readyState === "complete") {
      resolve();
      return;
    }
    printWindow.addEventListener("load", () => resolve(), { once: true });
    setTimeout(resolve, 3000);
  });
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
  stadt,
  printWindow: providedPrintWindow
}: ExportToPDFParams): Promise<void> => {
  // Try to open a print window immediately to preserve user activation
  const popupWindow = providedPrintWindow && !providedPrintWindow.closed
    ? providedPrintWindow
    : createPrintWindow();

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

  const printBlobUrl = createHtmlBlobUrl(fullHtml);
  let blobUrlInUse = false;

  let printFrame: HTMLIFrameElement | null = null;
  let printWindow: Window | null = null;
  let printDocument: Document | null = null;

  if (popupWindow && !popupWindow.closed) {
    printWindow = popupWindow;
    try {
      printWindow.location.href = printBlobUrl;
      blobUrlInUse = true;
      await waitForWindowLoad(printWindow);
      printDocument = printWindow.document;
    } catch (error) {
      console.warn("Failed to navigate print window to blob, trying document.write:", error);
      blobUrlInUse = false;
      try {
        printWindow.document.open();
        printWindow.document.write(fullHtml);
        printWindow.document.close();
        await waitForWindowLoad(printWindow);
        printDocument = printWindow.document;
      } catch (writeError) {
        console.warn("Failed to write to print window, falling back to iframe:", writeError);
        try {
          printWindow.close();
        } catch {
          // ignore
        }
        printWindow = null;
      }
    }
  }

  if (!printWindow || !printDocument) {
    if (printWindow && !printWindow.closed && printWindow !== window) {
      try {
        printWindow.close();
      } catch {
        // ignore
      }
    }
    URL.revokeObjectURL(printBlobUrl);
    blobUrlInUse = false;
    printFrame = createPrintFrame(fullHtml);
    await waitForFrameLoad(printFrame);
    printWindow = printFrame.contentWindow;
    printDocument = printFrame.contentDocument;
  }

  if (!printWindow || !printDocument) {
    if (printFrame?.parentNode) printFrame.parentNode.removeChild(printFrame);
    throw new Error("Could not create print target.");
  }

  // Wait for fonts
  try {
    await printDocument.fonts.ready;
  } catch (e) {
    console.warn("Font loading in print window:", e);
  }

  // Wait for images to load
  const images = printDocument.querySelectorAll('img');
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

  const cleanup = () => {
    if (blobUrlInUse) {
      URL.revokeObjectURL(printBlobUrl);
      blobUrlInUse = false;
    }
    if (printFrame?.parentNode) {
      printFrame.parentNode.removeChild(printFrame);
    }
    if (printWindow && !printWindow.closed && printWindow !== window) {
      printWindow.close();
    }
  };
  printWindow.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 60000);

  // Trigger print dialog
  printWindow.focus();
  printWindow.print();

  // The print frame is removed after printing or timeout.
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
      console.warn("Native PDF export failed, falling back to download:", error);
      const fallbackMode = await exportToPDFHtml2(
        params.htmlContent,
        params.fileName,
        params.showFoto,
        params.fotoUrl,
        params.showSignatur,
        params.signaturUrl,
        params.stadt
      );
      return fallbackMode;
    }
  }

  const downloadMode = await exportToPDFHtml2(
    params.htmlContent,
    params.fileName,
    params.showFoto,
    params.fotoUrl,
    params.showSignatur,
    params.signaturUrl,
    params.stadt
  );
  return downloadMode;
};

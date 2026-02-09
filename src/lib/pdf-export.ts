import { generateCVHtml } from "@/components/cv/CVTemplate";

interface ExportToPDFParams {
  htmlContent: string;
  fileName: string;
  showFoto?: boolean;
  fotoUrl?: string | null;
  showSignatur?: boolean;
  signaturUrl?: string | null;
  stadt?: string | null;
}

export type PdfExportMode = "print";

/**
 * Converts an image URL to a base64 data URL for reliable embedding in print
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
 * Wait for a window/document to fully load
 */
async function waitForWindowLoad(win: Window, timeoutMs = 5000): Promise<void> {
  await new Promise<void>((resolve) => {
    const doc = win.document;
    if (doc.readyState === "complete") {
      resolve();
      return;
    }
    win.addEventListener("load", () => resolve(), { once: true });
    setTimeout(resolve, timeoutMs);
  });
}

/**
 * Wait for all images in a document to load
 */
async function waitForImages(doc: Document): Promise<void> {
  const images = doc.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        setTimeout(resolve, 5000);
      });
    })
  );
}

/**
 * Wait for fonts to load in a document
 */
async function waitForFonts(doc: Document): Promise<void> {
  try {
    await doc.fonts.ready;
    await Promise.all([
      doc.fonts.load('300 12pt Spectral'),
      doc.fonts.load('400 12pt Spectral'),
      doc.fonts.load('600 12pt Spectral'),
    ]);
  } catch (e) {
    console.warn("Font loading warning:", e);
  }
}

/**
 * Export CV to PDF using the browser's native print dialog.
 * 
 * This is the ONLY export method — used for both mobile and desktop.
 * It produces a vector PDF that exactly matches the preview because it
 * uses the same HTML/CSS (mm-based dimensions, same fonts, same layout).
 * 
 * No html2canvas rasterization is involved, so:
 * - Text is sharp (vector) at any zoom level
 * - File size is small
 * - Photo dimensions are exact (35mm × 45mm, no stretching)
 * - Output is identical on all devices
 */
export const exportToPDF = async ({
  htmlContent,
  fileName,
  showFoto = false,
  fotoUrl,
  showSignatur = false,
  signaturUrl,
  stadt
}: ExportToPDFParams): Promise<PdfExportMode> => {
  // Convert images to data URLs for reliable embedding (avoids CORS in print context)
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

  // Generate the full standalone HTML document with mm-based CSS
  // This is the same function used by the preview, ensuring identical output
  const fullHtml = generateCVHtml({
    htmlContent,
    showFoto,
    fotoUrl: fotoDataUrl,
    showSignatur,
    signaturUrl: signaturDataUrl,
    stadt
  });

  // Create a blob URL from the HTML
  const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);

  // Open the HTML in a new tab/window
  const printWindow = window.open(blobUrl, "_blank");

  if (!printWindow) {
    // Popup blocked — try with an iframe as fallback
    URL.revokeObjectURL(blobUrl);
    return exportViaIframe(fullHtml);
  }

  try {
    // Wait for the page to fully load
    await waitForWindowLoad(printWindow);

    // Wait for fonts and images
    await waitForFonts(printWindow.document);
    await waitForImages(printWindow.document);

    // Small extra delay for final layout stabilization
    await new Promise(resolve => setTimeout(resolve, 300));

    // Set the document title (shows as default filename in print dialog)
    printWindow.document.title = fileName;

    // Clean up blob URL after print completes or window closes
    const cleanup = () => {
      URL.revokeObjectURL(blobUrl);
    };
    printWindow.addEventListener("afterprint", cleanup, { once: true });

    // Also clean up if window is closed without printing
    const closeCheck = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(closeCheck);
        cleanup();
      }
    }, 500);
    // Stop checking after 5 minutes
    setTimeout(() => clearInterval(closeCheck), 300000);

    // Trigger the print dialog
    printWindow.focus();
    printWindow.print();
  } catch (error) {
    console.warn("Print window error, trying iframe fallback:", error);
    URL.revokeObjectURL(blobUrl);
    try { printWindow.close(); } catch { /* ignore */ }
    return exportViaIframe(fullHtml);
  }

  return "print";
};

/**
 * Fallback: export via hidden iframe when popup is blocked
 */
async function exportViaIframe(fullHtml: string): Promise<PdfExportMode> {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  frame.style.visibility = "hidden";
  frame.setAttribute("aria-hidden", "true");
  frame.srcdoc = fullHtml;
  document.body.appendChild(frame);

  // Wait for iframe to load
  await new Promise<void>((resolve) => {
    if (frame.contentDocument?.readyState === "complete") {
      resolve();
      return;
    }
    frame.addEventListener("load", () => resolve(), { once: true });
    setTimeout(resolve, 5000);
  });

  const frameWindow = frame.contentWindow;
  const frameDoc = frame.contentDocument;

  if (!frameWindow || !frameDoc) {
    if (frame.parentNode) frame.parentNode.removeChild(frame);
    throw new Error("Could not create print target.");
  }

  // Wait for fonts and images
  await waitForFonts(frameDoc);
  await waitForImages(frameDoc);
  await new Promise(resolve => setTimeout(resolve, 300));

  // Cleanup after print
  const cleanup = () => {
    if (frame.parentNode) frame.parentNode.removeChild(frame);
  };
  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(cleanup, 60000);

  // Print
  frameWindow.focus();
  frameWindow.print();

  return "print";
}

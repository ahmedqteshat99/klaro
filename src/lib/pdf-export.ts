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

const PRINT_CONTAINER_ID = "pdf-print-container";
const PRINT_STYLE_ID = "pdf-print-styles";

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
 * Wait for all images inside an element to load
 */
async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img');
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
 * Clean up the print container and styles from the page
 */
function cleanup(): void {
  const container = document.getElementById(PRINT_CONTAINER_ID);
  const style = document.getElementById(PRINT_STYLE_ID);
  if (container?.parentNode) container.parentNode.removeChild(container);
  if (style?.parentNode) style.parentNode.removeChild(style);
}

/**
 * Export CV to PDF using the browser's native print dialog.
 *
 * Works on ALL devices (mobile + desktop) without popups:
 * 1. Injects the CV HTML into a hidden container on the current page
 * 2. Adds @media print CSS that hides everything except the CV
 * 3. Calls window.print() — never blocked by any browser
 * 4. Cleans up after printing
 *
 * Produces vector PDFs identical to the preview because it uses
 * the same generateCVHtml() with mm-based CSS.
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
  // Clean up any leftover containers from previous exports
  cleanup();

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

  // Generate the full standalone HTML document with mm-based CSS
  const fullHtml = generateCVHtml({
    htmlContent,
    showFoto,
    fotoUrl: fotoDataUrl,
    showSignatur,
    signaturUrl: signaturDataUrl,
    stadt
  });

  // Extract the <style> and <body> content from the generated HTML
  // We need to inject these into the current page
  const parser = new DOMParser();
  const doc = parser.parseFromString(fullHtml, "text/html");

  // Get all style content from the generated document
  const styleElements = doc.querySelectorAll("style");
  let styleContent = "";
  styleElements.forEach(s => { styleContent += s.textContent || ""; });

  // Get the body content (the cv-paper div)
  const bodyContent = doc.body.innerHTML;

  // Create the print container (hidden on screen, visible only in print)
  const container = document.createElement("div");
  container.id = PRINT_CONTAINER_ID;
  container.innerHTML = `<style>${styleContent}</style>${bodyContent}`;
  document.body.appendChild(container);

  // Add print-specific styles that hide everything except our container
  const printStyle = document.createElement("style");
  printStyle.id = PRINT_STYLE_ID;
  printStyle.textContent = `
    /* Hide the print container on screen */
    #${PRINT_CONTAINER_ID} {
      position: fixed;
      left: -9999px;
      top: 0;
      width: 210mm;
      visibility: hidden;
      z-index: -1;
    }

    @media print {
      /* Hide everything on the page */
      body > *:not(#${PRINT_CONTAINER_ID}) {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
      }

      /* Show and properly size our print container */
      #${PRINT_CONTAINER_ID} {
        position: static !important;
        left: auto !important;
        visibility: visible !important;
        z-index: auto !important;
        display: block !important;
        width: 210mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Reset body/html for clean print */
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 210mm !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Page setup */
      @page {
        size: A4;
        margin: 0;
      }
    }
  `;
  document.head.appendChild(printStyle);

  // Wait for images to load inside our container
  await waitForImages(container);

  // Small delay for layout stabilization
  await new Promise(resolve => setTimeout(resolve, 200));

  // Set document title (used as default filename in save-as-PDF dialog)
  const originalTitle = document.title;
  document.title = fileName;

  // Clean up after printing (or if user cancels)
  const afterPrint = () => {
    document.title = originalTitle;
    // Small delay to ensure print dialog has fully closed
    setTimeout(cleanup, 100);
  };
  window.addEventListener("afterprint", afterPrint, { once: true });

  // Safety timeout cleanup (5 minutes)
  setTimeout(() => {
    document.title = originalTitle;
    cleanup();
  }, 300000);

  // Trigger the print dialog — this is NEVER blocked on any browser
  window.print();

  return "print";
};

import html2pdf from "html2pdf.js";
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle,
  ImageRun,
  AlignmentType,
  convertInchesToTwip
} from "docx";
import { saveAs } from "file-saver";
import { sanitizeHtml } from "@/lib/sanitize-html";

// ============= Helper Functions =============

// Fetch image as ArrayBuffer for DOCX embedding
async function fetchImageAsBuffer(url: string): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await blob.arrayBuffer();
  } catch (error) {
    console.error("Failed to fetch image:", error);
    return null;
  }
}

// Convert image URL to base64 data URL for reliable PDF rendering
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

// No borders configuration for tables
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

// Create section header paragraph
function createSectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ 
        text: text.toUpperCase(), 
        bold: true, 
        size: 24, // 12pt
        font: "Spectral"
      })
    ],
    spacing: { before: 300, after: 120 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "333333" }
    }
  });
}

// Create two-column entry table (date | content)
function createTwoColumnEntry(
  date: string, 
  title: string, 
  subtitle?: string, 
  bullets?: string[]
): Table {
  const contentChildren: Paragraph[] = [];
  
  // Title (bold)
  contentChildren.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 22, font: "Spectral" })],
    spacing: { after: 40 }
  }));
  
  // Subtitle (institution/hospital)
  if (subtitle) {
    contentChildren.push(new Paragraph({
      children: [new TextRun({ text: subtitle, size: 22, font: "Spectral" })],
      spacing: { after: 40 }
    }));
  }
  
  // Bullet points
  if (bullets && bullets.length > 0) {
    bullets.forEach(bullet => {
      contentChildren.push(new Paragraph({
        children: [new TextRun({ text: `• ${bullet}`, size: 22, font: "Spectral" })],
        spacing: { after: 20 },
        indent: { left: 200 }
      }));
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorders.top,
      bottom: noBorders.bottom,
      left: noBorders.left,
      right: noBorders.right,
      insideHorizontal: noBorders.top,
      insideVertical: noBorders.top,
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1800, type: WidthType.DXA }, // ~110px
            borders: noBorders,
            children: [
              new Paragraph({
                children: [new TextRun({ text: date, size: 20, color: "666666", font: "Spectral" })],
              })
            ]
          }),
          new TableCell({
            borders: noBorders,
            children: contentChildren
          })
        ]
      })
    ]
  });
}

// Create language table row
function createLanguageTable(languages: Array<{ language: string; level: string; description: string }>): Table {
  const rows = languages.map(lang => 
    new TableRow({
      children: [
        new TableCell({
          width: { size: 2200, type: WidthType.DXA },
          borders: noBorders,
          children: [new Paragraph({
            children: [new TextRun({ text: lang.language, bold: true, size: 22, font: "Spectral" })]
          })]
        }),
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          borders: noBorders,
          children: [new Paragraph({
            children: [new TextRun({ text: lang.level, size: 22, color: "666666", font: "Spectral" })]
          })]
        }),
        new TableCell({
          borders: noBorders,
          children: [new Paragraph({
            children: [new TextRun({ text: lang.description, size: 22, font: "Spectral" })]
          })]
        })
      ]
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorders.top,
      bottom: noBorders.bottom,
      left: noBorders.left,
      right: noBorders.right,
      insideHorizontal: noBorders.top,
      insideVertical: noBorders.top,
    },
    rows
  });
}

// Parse HTML to structured CV data
interface CVEntry {
  date: string;
  title: string;
  subtitle?: string;
  bullets: string[];
}

interface CVSection {
  title: string;
  type: 'entries' | 'list' | 'languages' | 'text';
  entries?: CVEntry[];
  items?: string[];
  languages?: Array<{ language: string; level: string; description: string }>;
  text?: string;
}

// Anschreiben (cover letter) structure
interface AnschreibenData {
  senderLines: string[];
  recipientLines: string[];
  date: string;
  subject: string;
  bodyParagraphs: string[];
}

// Parse Anschreiben HTML to structured data
function parseAnschreibenHtml(html: string): AnschreibenData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");

  const data: AnschreibenData = {
    senderLines: [],
    recipientLines: [],
    date: '',
    subject: '',
    bodyParagraphs: []
  };

  const rootDiv = doc.body.firstChild as Element;
  if (!rootDiv) return data;

  // Find the flexbox header (sender/recipient)
  const flexHeader = rootDiv.querySelector('div[style*="display: flex"], div[style*="display:flex"]');
  if (flexHeader) {
    const children = flexHeader.children;
    if (children.length >= 2) {
      // First child = sender
      const senderDiv = children[0];
      senderDiv.querySelectorAll('p').forEach(p => {
        const text = p.textContent?.trim();
        if (text) data.senderLines.push(text);
      });
      // If no <p> tags, try direct text content split by <br>
      if (data.senderLines.length === 0) {
        const senderHtml = senderDiv.innerHTML;
        senderHtml.split(/<br\s*\/?>/i).forEach(line => {
          const text = line.replace(/<[^>]+>/g, '').trim();
          if (text) data.senderLines.push(text);
        });
      }

      // Second child = recipient
      const recipientDiv = children[1];
      recipientDiv.querySelectorAll('p').forEach(p => {
        const text = p.textContent?.trim();
        if (text) data.recipientLines.push(text);
      });
      // If no <p> tags, try direct text content split by <br>
      if (data.recipientLines.length === 0) {
        const recipientHtml = recipientDiv.innerHTML;
        recipientHtml.split(/<br\s*\/?>/i).forEach(line => {
          const text = line.replace(/<[^>]+>/g, '').trim();
          if (text) data.recipientLines.push(text);
        });
      }
    }
  }

  // Find all paragraphs in the document
  rootDiv.querySelectorAll('p').forEach(p => {
    const text = p.textContent?.trim() || '';
    if (!text) return;

    // Check if inside the flex header (already processed)
    if (flexHeader && flexHeader.contains(p)) return;

    // Check for date (right-aligned paragraph with date format)
    const style = p.getAttribute('style') || '';
    if (style.includes('text-align: right') || style.includes('text-align:right')) {
      // Check if it looks like a date (DD.MM.YYYY)
      if (/\d{1,2}\.\d{1,2}\.\d{4}/.test(text)) {
        data.date = text;
        return;
      }
    }

    // Check for subject line (contains <strong> with "Betreff" or "Bewerbung")
    const strongEl = p.querySelector('strong');
    if (strongEl) {
      const strongText = strongEl.textContent?.trim() || '';
      if (strongText.toLowerCase().includes('betreff') || strongText.toLowerCase().includes('bewerbung')) {
        data.subject = strongText;
        return;
      }
    }

    // Regular body paragraph
    data.bodyParagraphs.push(text);
  });

  return data;
}

// Check if HTML is a cover letter (Anschreiben) vs CV
function isAnschreibenHtml(html: string): boolean {
  // Anschreiben typically has flexbox header layout and lacks CV-specific elements
  const hasFlexHeader = html.includes('display: flex') || html.includes('display:flex');
  const hasCvEntry = html.includes('cv-entry');
  const hasCvLanguages = html.includes('cv-languages');
  const hasH2Sections = /<h2>/i.test(html);

  return hasFlexHeader && !hasCvEntry && !hasCvLanguages && !hasH2Sections;
}

function parseHtmlToStructure(html: string): CVSection[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const sections: CVSection[] = [];
  let currentSection: CVSection | null = null;

  const rootDiv = doc.body.firstChild;
  if (!rootDiv) return sections;

  rootDiv.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'h2') {
      // Start a new section
      if (currentSection) sections.push(currentSection);
      currentSection = { title: element.textContent?.trim() || '', type: 'text' };
    } else if (tagName === 'div' && element.classList.contains('cv-entry')) {
      // Two-column entry
      if (currentSection) {
        if (currentSection.type !== 'entries') {
          currentSection.type = 'entries';
          currentSection.entries = [];
        }
        const dateEl = element.querySelector('.cv-date');
        const contentEl = element.querySelector('.cv-content');
        const entry: CVEntry = {
          date: dateEl?.textContent?.trim() || '',
          title: '',
          bullets: []
        };
        if (contentEl) {
          const h3 = contentEl.querySelector('h3');
          const p = contentEl.querySelector('p');
          entry.title = h3?.textContent?.trim() || '';
          entry.subtitle = p?.textContent?.trim();
          contentEl.querySelectorAll('li').forEach(li => {
            entry.bullets.push(li.textContent?.trim() || '');
          });
        }
        currentSection.entries?.push(entry);
      }
    } else if (tagName === 'table' && element.classList.contains('cv-languages')) {
      // Language table
      if (currentSection) {
        currentSection.type = 'languages';
        currentSection.languages = [];
        element.querySelectorAll('tr').forEach(tr => {
          const cells = tr.querySelectorAll('td');
          if (cells.length >= 2) {
            currentSection?.languages?.push({
              language: cells[0]?.textContent?.trim() || '',
              level: cells[1]?.textContent?.trim() || '',
              description: cells[2]?.textContent?.trim() || ''
            });
          }
        });
      }
    } else if (tagName === 'ul') {
      // List items (publications, certificates, skills)
      if (currentSection) {
        if (currentSection.type !== 'list') {
          currentSection.type = 'list';
          currentSection.items = [];
        }
        element.querySelectorAll('li').forEach(li => {
          currentSection?.items?.push(li.textContent?.trim() || '');
        });
      }
    } else if (tagName === 'p') {
      // Plain text paragraph
      if (currentSection) {
        const text = element.textContent?.trim();
        if (text) {
          currentSection.type = 'text';
          currentSection.text = (currentSection.text || '') + ' ' + text;
        }
      }
    }
  });

  if (currentSection) sections.push(currentSection);
  return sections;
}

// ============= PDF Export =============

export const exportToPDF = async (
  htmlContent: string,
  fileName: string,
  showFoto?: boolean,
  fotoUrl?: string | null,
  showSignatur?: boolean,
  signaturUrl?: string | null,
  stadt?: string | null
): Promise<void> => {
  const sanitizedHtml = sanitizeHtml(htmlContent);
  // Preload Spectral font to prevent race conditions
  try {
    await document.fonts.load('300 12pt Spectral');
    await document.fonts.load('600 12pt Spectral');
  } catch (e) {
    console.warn("Font preload failed, continuing anyway:", e);
  }

  // Convert images to data URLs to avoid CORS issues with html2canvas
  let fotoDataUrl: string | null = null;
  let signaturDataUrl: string | null = null;

  if (showFoto && fotoUrl) {
    fotoDataUrl = await imageUrlToDataUrl(fotoUrl);
    if (!fotoDataUrl) {
      console.warn("Could not convert photo to data URL, using original URL");
      fotoDataUrl = fotoUrl;
    }
  }

  if (showSignatur && signaturUrl) {
    signaturDataUrl = await imageUrlToDataUrl(signaturUrl);
    if (!signaturDataUrl) {
      console.warn("Could not convert signature to data URL, using original URL");
      signaturDataUrl = signaturUrl;
    }
  }

  // Create wrapper - matching preview styles from index.css
  let fullHtml = `
    <div class="document-preview cv-paper" style="font-family: 'Spectral', Georgia, serif; font-size: 10.5pt; font-weight: 300; line-height: 1.35; color: #1a1a1a; padding: 0; overflow: visible; box-sizing: border-box;">
      <style>
        * {
          box-sizing: border-box;
        }

        .cv-paper {
          width: 210mm !important;
          min-height: 297mm !important;
          padding: 15mm !important;
          margin: 0 !important;
          background: #ffffff !important;
          box-sizing: border-box !important;
          position: relative !important;
        }

        .cv-content-area {
          width: 100% !important;
          position: relative !important;
        }

        .cv-content-area::after {
          content: "";
          display: table;
          clear: both;
        }

        /* Photo container - German CV standard portrait size (35mm x 45mm) */
        .cv-photo-container {
          width: 35mm !important;
          height: 45mm !important;
          float: right !important;
          margin-left: 5mm !important;
          margin-bottom: 3mm !important;
          border-radius: 1mm !important;
          border: 0.3mm solid #e5e5e5 !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
        }

        .cv-photo-container img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          object-position: center !important;
          display: block !important;
        }

        /* Section headers - matching .document-preview h2 from index.css */
        h2 {
          font-family: 'Spectral', Georgia, serif !important;
          font-weight: 600 !important;
          font-size: 11pt !important;
          text-transform: uppercase !important;
          letter-spacing: 0.08em !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.6rem !important;
          color: #1a1a1a !important;
          border-bottom: 1px solid #333 !important;
          padding-bottom: 0.2rem !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        /* Subsection headers - matching .document-preview h3 */
        h3 {
          font-family: 'Spectral', Georgia, serif !important;
          font-weight: 600 !important;
          font-size: 10.5pt !important;
          margin-top: 0 !important;
          margin-bottom: 0.15rem !important;
          color: #262626 !important;
          page-break-after: avoid !important;
        }

        p {
          margin-bottom: 0.35rem !important;
          orphans: 3 !important;
          widows: 3 !important;
        }

        /* Regular unordered lists - with disc bullets */
        ul {
          list-style-type: disc !important;
          padding-left: 1.1rem !important;
          margin: 0.2rem 0 0.5rem 0 !important;
        }

        li {
          margin-bottom: 0.1rem !important;
          line-height: 1.3 !important;
        }

        strong {
          font-weight: 600 !important;
        }

        /* Two-column entry - TABLE-BASED for html2canvas compatibility */
        .cv-entry {
          display: table !important;
          width: 100% !important;
          table-layout: fixed !important;
          margin-bottom: 0.75rem !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .cv-entry .cv-date {
          display: table-cell !important;
          width: 110px !important;
          font-size: 9.5pt !important;
          color: #666 !important;
          vertical-align: top !important;
          padding-top: 0.1rem !important;
          padding-right: 0.75rem !important;
        }

        .cv-entry .cv-content {
          display: table-cell !important;
          vertical-align: top !important;
          min-width: 0 !important;
        }

        .cv-entry .cv-content h3 {
          font-weight: 600 !important;
          margin: 0 0 0.1rem 0 !important;
        }

        .cv-entry .cv-content p {
          margin: 0 0 0.2rem 0 !important;
        }

        .cv-entry .cv-content ul {
          margin-top: 0.15rem !important;
        }

        /* Language table - matching .document-preview .cv-languages */
        .cv-languages {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 0.25rem 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .cv-languages tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .cv-languages td {
          padding: 0.15rem 0.75rem 0.15rem 0 !important;
          vertical-align: top !important;
        }

        .cv-languages td:first-child {
          font-weight: 500 !important;
          width: 140px !important;
        }

        .cv-languages td:nth-child(2) {
          width: 60px !important;
          color: #666 !important;
        }

        .cv-languages td:nth-child(3) {
          color: #666 !important;
        }

        /* Publications and certificates - use disc bullets (::before doesn't work in html2canvas) */
        .cv-publications, .cv-certs {
          list-style-type: disc !important;
          padding-left: 1.2rem !important;
          margin: 0.25rem 0 !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }

        .cv-publications li, .cv-certs li {
          margin-bottom: 0.35rem !important;
          line-height: 1.35 !important;
        }

        /* Signature block - must not be cut */
        .cv-signature-block {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          page-break-before: auto !important;
        }
      </style>
  `;

  fullHtml += `<div class="cv-content-area">`;

  // Add photo using FLOAT - matching .cv-photo-container from index.css
  if (showFoto && fotoDataUrl) {
    fullHtml += `
      <div class="cv-photo-container">
        <img src="${fotoDataUrl}" alt="Bewerbungsfoto" />
      </div>
    `;
  }

  fullHtml += sanitizedHtml;

  // Add signature block if enabled - matching .cv-signature-block from index.css
  if (showSignatur && signaturDataUrl) {
    const currentDate = new Date().toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    fullHtml += `
      <div class="cv-signature-block" style="margin-top: 2rem; text-align: right; clear: both; padding-bottom: 10px;">
        <img src="${signaturDataUrl}" alt="Unterschrift" style="height: 40px; width: auto; display: block; margin-left: auto;" />
        <p style="font-size: 9pt; color: #666; margin-top: 0.25rem; margin-bottom: 0;">${stadt || 'Ort'}, ${currentDate}</p>
      </div>
    `;
  }

  // Close content area and main wrapper
  fullHtml += `<div style="clear: both; height: 1px;"></div></div></div>`;

  const element = document.createElement("div");
  element.innerHTML = fullHtml;
  element.style.width = "210mm"; // A4 width
  element.style.backgroundColor = "#ffffff";
  element.style.padding = "0";
  element.style.margin = "0";
  element.style.overflow = "visible";
  element.style.position = "relative";
  document.body.appendChild(element);

  const prevHtmlOverflow = document.documentElement.style.overflow;
  const prevBodyOverflow = document.body.style.overflow;
  document.documentElement.style.overflow = "visible";
  document.body.style.overflow = "visible";

  // Wait for all images to fully load before rendering
  const images = element.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if image fails
        // Timeout fallback after 3 seconds
        setTimeout(() => resolve(), 3000);
      });
    })
  );

  // Additional wait for layout to stabilize (increased for image rendering)
  await new Promise(resolve => setTimeout(resolve, 500));

  const renderWidth = element.scrollWidth || element.clientWidth;
  const renderHeight = element.scrollHeight || element.clientHeight;

  const opt = {
    margin: [0, 0, 0, 0] as [number, number, number, number],
    filename: `${fileName}.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 15000,
      windowWidth: renderWidth,
      windowHeight: renderHeight,
      width: renderWidth,
      height: renderHeight,
      scrollX: 0,
      scrollY: 0
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['h2', 'h3', '.cv-entry', '.cv-languages', '.cv-signature-block', 'tr', 'table'] }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(element);
    document.documentElement.style.overflow = prevHtmlOverflow;
    document.body.style.overflow = prevBodyOverflow;
  }
};

// ============= DOCX Export =============

export const exportToDocx = async (
  htmlContent: string,
  fileName: string,
  showFoto?: boolean,
  fotoUrl?: string | null,
  showSignatur?: boolean,
  signaturUrl?: string | null,
  stadt?: string | null
): Promise<void> => {
  const sanitizedHtml = sanitizeHtml(htmlContent);
  const docChildren: (Paragraph | Table)[] = [];

  const buildLineParagraphs = (lines: string[], alignment?: AlignmentType) =>
    lines.map((line) =>
      new Paragraph({
        alignment,
        children: [new TextRun({ text: line, size: 22, font: "Spectral" })],
        spacing: { after: 40 },
      })
    );

  if (isAnschreibenHtml(sanitizedHtml)) {
    const anschreiben = parseAnschreibenHtml(sanitizedHtml);

    // Sender/Recipient block
    const senderParagraphs = buildLineParagraphs(anschreiben.senderLines, AlignmentType.LEFT);
    const recipientParagraphs = buildLineParagraphs(anschreiben.recipientLines, AlignmentType.RIGHT);

    if (senderParagraphs.length || recipientParagraphs.length) {
      docChildren.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: noBorders.top,
            bottom: noBorders.bottom,
            left: noBorders.left,
            right: noBorders.right,
            insideHorizontal: noBorders.top,
            insideVertical: noBorders.top,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: senderParagraphs.length ? senderParagraphs : [new Paragraph({ text: "" })],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: noBorders,
                  children: recipientParagraphs.length ? recipientParagraphs : [new Paragraph({ text: "" })],
                }),
              ],
            }),
          ],
        })
      );
    }

    // Date (right-aligned)
    const dateText =
      anschreiben.date ||
      new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: dateText, size: 20, color: "666666", font: "Spectral" })],
        spacing: { after: 120 },
      })
    );

    // Subject
    if (anschreiben.subject) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: anschreiben.subject, bold: true, size: 22, font: "Spectral" })],
          spacing: { after: 120 },
        })
      );
    }

    // Body paragraphs
    anschreiben.bodyParagraphs.forEach((paragraph) => {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: paragraph, size: 22, font: "Spectral" })],
          spacing: { after: 120 },
        })
      );
    });

    // Signature block
    if (showSignatur && signaturUrl) {
      const signatureBuffer = await fetchImageAsBuffer(signaturUrl);
      docChildren.push(new Paragraph({ text: "", spacing: { before: 200 } }));

      if (signatureBuffer) {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new ImageRun({
                data: signatureBuffer,
                transformation: { width: 120, height: 40 },
                type: "png",
              }),
            ],
          })
        );
      }

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({
              text: `${stadt || "Ort"}, ${dateText}`,
              size: 20,
              color: "666666",
              font: "Spectral",
            }),
          ],
          spacing: { before: 80 },
        })
      );
    }
  } else {
    const sections = parseHtmlToStructure(sanitizedHtml);

    // Fetch photo if needed
    let photoBuffer: ArrayBuffer | null = null;
    if (showFoto && fotoUrl) {
      photoBuffer = await fetchImageAsBuffer(fotoUrl);
    }

    // Add photo at the top right (simulated with right-aligned paragraph)
    if (photoBuffer) {
      docChildren.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new ImageRun({
            data: photoBuffer,
            transformation: { width: 98, height: 128 }, // ~35x45mm at 72dpi
            type: 'png'
          })
        ],
        spacing: { after: 200 }
      }));
    }

    // Process each section
    for (const section of sections) {
      // Section header
      docChildren.push(createSectionHeader(section.title));

      switch (section.type) {
        case 'entries':
          if (section.entries) {
            for (const entry of section.entries) {
              docChildren.push(createTwoColumnEntry(
                entry.date, 
                entry.title, 
                entry.subtitle, 
                entry.bullets
              ));
              // Add spacing between entries
              docChildren.push(new Paragraph({ text: '', spacing: { after: 80 } }));
            }
          }
          break;

        case 'languages':
          if (section.languages && section.languages.length > 0) {
            docChildren.push(createLanguageTable(section.languages));
          }
          break;

        case 'list':
          if (section.items) {
            for (const item of section.items) {
              docChildren.push(new Paragraph({
                children: [new TextRun({ text: `• ${item}`, size: 22, font: "Spectral" })],
                spacing: { after: 60 },
                indent: { left: 200 }
              }));
            }
          }
          break;

        case 'text':
          if (section.text) {
            docChildren.push(new Paragraph({
              children: [new TextRun({ text: section.text.trim(), size: 22, font: "Spectral" })],
              spacing: { after: 120 }
            }));
          }
          break;
      }
    }

    // Add signature at the end
    if (showSignatur && signaturUrl) {
      const signatureBuffer = await fetchImageAsBuffer(signaturUrl);
      const currentDate = new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });

      // Add some spacing before signature
      docChildren.push(new Paragraph({ text: '', spacing: { before: 400 } }));

      if (signatureBuffer) {
        docChildren.push(new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new ImageRun({
              data: signatureBuffer,
              transformation: { width: 120, height: 40 },
              type: 'png'
            })
          ]
        }));
      }

      docChildren.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ 
            text: `${stadt || 'Ort'}, ${currentDate}`, 
            size: 20, 
            color: "666666",
            font: "Spectral"
          })
        ],
        spacing: { before: 80 }
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.6),
            right: convertInchesToTwip(0.6),
            bottom: convertInchesToTwip(0.6),
            left: convertInchesToTwip(0.6)
          }
        }
      },
      children: docChildren
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};

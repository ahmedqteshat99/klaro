import { forwardRef } from "react";
import { sanitizeHtml } from "@/lib/sanitize-html";

interface CVTemplateProps {
  htmlContent: string;
  showFoto?: boolean;
  fotoUrl?: string | null;
  showSignatur?: boolean;
  signaturUrl?: string | null;
  stadt?: string | null;
  forPrint?: boolean;
  paperClassName?: string;
  useBasePaperClass?: boolean;
}

const CVTemplate = forwardRef<HTMLDivElement, CVTemplateProps>(({
  htmlContent,
  showFoto = false,
  fotoUrl,
  showSignatur = false,
  signaturUrl,
  stadt,
  forPrint = false,
  paperClassName,
  useBasePaperClass = true
}, ref) => {
  const sanitizedHtml = sanitizeHtml(htmlContent);
  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div
      ref={ref}
      className={`${useBasePaperClass ? 'cv-paper' : ''} ${forPrint ? 'cv-paper--print' : ''} ${paperClassName || ''}`}
    >
      <div className="cv-content-area">
        {/* Photo - top right, German CV standard portrait size (35mm x 45mm) */}
        {showFoto && fotoUrl && (
          <div className="cv-photo-container">
            <img
              src={fotoUrl}
              alt="Bewerbungsfoto"
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* CV Content - sanitized */}
        <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />

        {/* Signature block - bottom right with location and date */}
        {showSignatur && signaturUrl && (
          <div className="cv-signature-block">
            <img
              src={signaturUrl}
              alt="Unterschrift"
              crossOrigin="anonymous"
            />
            <p>{stadt || 'Ort'}, {currentDate}</p>
          </div>
        )}
      </div>
    </div>
  );
});

CVTemplate.displayName = "CVTemplate";

export default CVTemplate;

// Helper function to generate the full HTML string for PDF export
// Uses the same mm-based CSS as index.css to ensure pixel-perfect match
export const generateCVHtml = ({
  htmlContent,
  showFoto = false,
  fotoUrl,
  showSignatur = false,
  signaturUrl,
  stadt
}: Omit<CVTemplateProps, 'forPrint'>): string => {
  const sanitizedHtml = sanitizeHtml(htmlContent);
  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  let html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lebenslauf</title>
  <style>
    /* Self-hosted Spectral font via @font-face */
    @font-face {
      font-family: 'Spectral';
      font-style: normal;
      font-weight: 300;
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M5knjsS_ul.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Spectral';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/spectral/v13/rnCt-xNNww_2s0amA9uSsHnQ.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Spectral';
      font-style: normal;
      font-weight: 500;
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M5kijsSPul.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Spectral';
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M5khDtS_ul.woff2') format('woff2');
    }

    @font-face {
      font-family: 'Spectral';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('https://fonts.gstatic.com/s/spectral/v13/rnCr-xNNww_2s0amA9M5knTuS_ul.woff2') format('woff2');
    }

    /* Page setup for A4 printing - no margins since we use padding in .cv-paper */
    @page {
      size: A4;
      margin: 0mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      width: 100%;
      max-width: 210mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-family: 'Spectral', Georgia, serif;
      font-weight: 300;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* CV Paper - Fixed A4 container with mm-based dimensions */
    .cv-paper {
      width: 100%;
      max-width: 210mm;
      padding: 15mm;
      margin: 0;
      background: #ffffff;
      box-sizing: border-box;
      font-family: 'Spectral', Georgia, serif;
      font-weight: 300;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #1a1a1a;
      position: relative;
    }

    /* Content area wrapper */
    .cv-content-area {
      width: 100%;
      position: relative;
    }

    .cv-content-area::after {
      content: "";
      display: table;
      clear: both;
    }

    /* Photo container - German CV standard portrait (35mm x 45mm) */
    .cv-photo-container {
      width: 35mm;
      height: 45mm;
      float: right;
      margin-left: 5mm;
      margin-bottom: 3mm;
      border-radius: 1mm;
      border: 0.3mm solid #e5e5e5;
      box-sizing: border-box;
      overflow: hidden;
    }

    .cv-photo-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Section Headers */
    h2 {
      font-family: 'Spectral', Georgia, serif;
      font-weight: 600;
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 5mm;
      margin-bottom: 2.5mm;
      color: #1a1a1a;
      border-bottom: 0.3mm solid #333333;
      padding-bottom: 1mm;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Subsection Headers */
    h3 {
      font-family: 'Spectral', Georgia, serif;
      font-weight: 600;
      font-size: 10.5pt;
      margin-top: 0;
      margin-bottom: 0.5mm;
      color: #262626;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 1.5mm;
      orphans: 3;
      widows: 3;
    }

    strong {
      font-weight: 600;
    }

    /* Lists */
    ul {
      list-style-type: disc;
      padding-left: 5mm;
      margin: 1mm 0 2mm 0;
    }

    li {
      margin-bottom: 0.5mm;
      line-height: 1.3;
    }

    /* Two-column entry layout using CSS Grid with mm-based columns */
    .cv-entry {
      display: grid;
      grid-template-columns: 30mm 1fr;
      gap: 3mm;
      margin-bottom: 3mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .cv-entry .cv-date {
      font-size: 9.5pt;
      color: #666666;
      padding-top: 0.3mm;
    }

    .cv-entry .cv-content {
      min-width: 0;
    }

    .cv-entry .cv-content h3 {
      font-weight: 600;
      margin: 0 0 0.5mm 0;
    }

    .cv-entry .cv-content p {
      margin: 0 0 1mm 0;
    }

    .cv-entry .cv-content ul {
      margin-top: 0.5mm;
    }

    /* Language table */
    .cv-languages {
      width: 100%;
      border-collapse: collapse;
      margin: 1mm 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .cv-languages tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .cv-languages td {
      padding: 0.5mm 3mm 0.5mm 0;
      vertical-align: top;
    }

    .cv-languages td:first-child {
      font-weight: 500;
      width: 40mm;
    }

    .cv-languages td:nth-child(2) {
      width: 20mm;
      color: #666666;
    }

    .cv-languages td:nth-child(3) {
      color: #666666;
    }

    /* Publications and certificates */
    .cv-publications, .cv-certs {
      list-style-type: disc;
      padding-left: 5mm;
      margin: 1mm 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .cv-publications li, .cv-certs li {
      margin-bottom: 1.5mm;
      line-height: 1.35;
    }

    /* Signature block - mm-based dimensions */
    .cv-signature-block {
      margin-top: 8mm;
      text-align: right;
      clear: both;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .cv-signature-block img {
      height: 12mm;
      width: auto;
      max-width: 50mm;
      margin-left: auto;
      display: block;
      object-fit: contain;
    }

    .cv-signature-block p {
      font-size: 9pt;
      color: #666666;
      margin-top: 1mm;
      margin-bottom: 0;
    }

    /* Print-specific overrides */
    @media print {
      html, body {
        width: 100%;
        max-width: 210mm;
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        min-height: 0 !important;
      }

      .cv-paper {
        width: 100% !important;
        max-width: 210mm !important;
        padding: 15mm !important;
        margin: 0 !important;
        height: auto !important;
        min-height: 0 !important;
        /* NO page-break-after — it creates a blank trailing page */
      }

      h2, h3 {
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .cv-entry,
      .cv-languages,
      .cv-signature-block,
      .cv-photo-container,
      table,
      tr,
      .cv-publications,
      .cv-certs {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      img {
        max-width: 100% !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Grid layout maintained in print */
      .cv-entry {
        display: grid !important;
        grid-template-columns: 30mm 1fr !important;
        gap: 3mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="cv-paper">
    <div class="cv-content-area">
`;

  // Add photo
  if (showFoto && fotoUrl) {
    html += `
      <div class="cv-photo-container">
        <img src="${fotoUrl}" alt="Bewerbungsfoto" crossorigin="anonymous" />
      </div>
`;
  }

  // Add content
  html += sanitizedHtml;

  // Add signature
  if (showSignatur && signaturUrl) {
    html += `
      <div class="cv-signature-block">
        <img src="${signaturUrl}" alt="Unterschrift" crossorigin="anonymous" />
        <p>${stadt || 'Ort'}, ${currentDate}</p>
      </div>
`;
  }

  html += `
    </div>
  </div>
</body>
</html>`;

  return html;
};

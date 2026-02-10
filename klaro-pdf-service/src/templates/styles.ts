/**
 * Shared CSS styles for both CV and Anschreiben templates.
 * Ported from the frontend's CVTemplate.tsx generateCVHtml() function.
 * Uses mm-based dimensions for precise A4 print output.
 */
export const sharedStyles = `
  /* Self-hosted Spectral font via @font-face (v15 latin) */
  @font-face {
    font-family: 'Spectral';
    font-style: normal;
    font-weight: 300;
    font-display: swap;
    src: url('https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9uSsG3BafaPWnII.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Spectral';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('https://fonts.gstatic.com/s/spectral/v15/rnCr-xNNww_2s0amA9M5knjsS_ul.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Spectral';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url('https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9vKsW3BafaPWnII.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Spectral';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url('https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9vmtm3BafaPWnII.woff2') format('woff2');
  }

  @font-face {
    font-family: 'Spectral';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('https://fonts.gstatic.com/s/spectral/v15/rnCs-xNNww_2s0amA9uCt23BafaPWnII.woff2') format('woff2');
  }

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
`;

/**
 * CV-specific CSS classes — identical to the frontend's generateCVHtml().
 */
export const cvStyles = `
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

  .cv-content-area {
    width: 100%;
    position: relative;
  }

  .cv-content-area::after {
    content: "";
    display: table;
    clear: both;
  }

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

  ul {
    list-style-type: disc;
    padding-left: 5mm;
    margin: 1mm 0 2mm 0;
  }

  li {
    margin-bottom: 0.5mm;
    line-height: 1.3;
  }

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

    .cv-entry {
      display: grid !important;
      grid-template-columns: 30mm 1fr !important;
      gap: 3mm !important;
    }
  }
`;

/**
 * Anschreiben-specific CSS — A4 letter format with proper spacing.
 */
export const anschreibenStyles = `
  .anschreiben-paper {
    width: 100%;
    max-width: 210mm;
    min-height: 297mm;
    padding: 20mm 25mm;
    margin: 0;
    background: #ffffff;
    box-sizing: border-box;
    font-family: 'Spectral', Georgia, serif;
    font-weight: 300;
    font-size: 11pt;
    line-height: 1.5;
    color: #1a1a1a;
    position: relative;
  }

  .anschreiben-paper p {
    margin-bottom: 3mm;
    orphans: 3;
    widows: 3;
  }

  .anschreiben-paper strong {
    font-weight: 600;
  }

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

  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      min-height: 0 !important;
    }

    .anschreiben-paper {
      width: 100% !important;
      max-width: 210mm !important;
      padding: 20mm 25mm !important;
      margin: 0 !important;
      height: auto !important;
      min-height: 0 !important;
    }
  }
`;

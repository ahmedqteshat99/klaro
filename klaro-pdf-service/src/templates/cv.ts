import { sharedStyles, cvStyles } from "./styles.js";

export interface CVTemplateParams {
    htmlContent: string;
    showFoto?: boolean;
    fotoUrl?: string | null;
    showSignatur?: boolean;
    signaturUrl?: string | null;
    stadt?: string | null;
}

/**
 * Generate a complete standalone HTML document for CV PDF rendering.
 * This is the server-side equivalent of generateCVHtml() from CVTemplate.tsx.
 */
export function buildCVHtml({
    htmlContent,
    showFoto = false,
    fotoUrl,
    showSignatur = false,
    signaturUrl,
    stadt,
}: CVTemplateParams): string {
    const currentDate = new Date().toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    let html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lebenslauf</title>
  <style>
    ${sharedStyles}
    ${cvStyles}
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
    html += htmlContent;

    // Add signature
    if (showSignatur && signaturUrl) {
        html += `
      <div class="cv-signature-block">
        <img src="${signaturUrl}" alt="Unterschrift" crossorigin="anonymous" />
        <p>${stadt || "Ort"}, ${currentDate}</p>
      </div>
`;
    }

    html += `
    </div>
  </div>
</body>
</html>`;

    return html;
}

import { sharedStyles, anschreibenStyles } from "./styles.js";

export interface AnschreibenTemplateParams {
    htmlContent: string;
    showSignatur?: boolean;
    signaturUrl?: string | null;
    stadt?: string | null;
}

/**
 * Generate a complete standalone HTML document for Anschreiben PDF rendering.
 */
export function buildAnschreibenHtml({
    htmlContent,
    showSignatur = false,
    signaturUrl,
    stadt,
}: AnschreibenTemplateParams): string {
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
  <title>Anschreiben</title>
  <style>
    ${sharedStyles}
    ${anschreibenStyles}
  </style>
</head>
<body>
  <div class="anschreiben-paper">
`;

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
</body>
</html>`;

    return html;
}

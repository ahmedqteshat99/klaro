import express from "express";
import cors from "cors";
import { requireAuth, type AuthenticatedRequest } from "./auth.js";
import { renderPdf, closeBrowser } from "./render.js";
import { buildCVHtml } from "./templates/cv.js";
import { buildAnschreibenHtml } from "./templates/anschreiben.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// ── CORS ────────────────────────────────────────────────────────────────────
// All origins are allowed — the endpoint is protected by JWT auth, so CORS
// restrictions add no security value and only cause issues on mobile Safari.
app.use(
    cors({
        origin: true,
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "5mb" }));

// ── Health Check ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── PDF Generation ──────────────────────────────────────────────────────────
interface GeneratePdfBody {
    type: "cv" | "anschreiben";
    htmlContent: string;
    showFoto?: boolean;
    fotoUrl?: string | null;
    showSignatur?: boolean;
    signaturUrl?: string | null;
    stadt?: string | null;
}

app.post(
    "/generate-pdf",
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
        const startTime = Date.now();

        try {
            const body = req.body as GeneratePdfBody;

            // Validate required fields
            if (!body.type || !["cv", "anschreiben"].includes(body.type)) {
                res.status(400).json({ error: "Invalid type. Must be 'cv' or 'anschreiben'." });
                return;
            }

            if (!body.htmlContent || typeof body.htmlContent !== "string") {
                res.status(400).json({ error: "htmlContent is required and must be a string." });
                return;
            }

            // Build the full HTML document from the template
            let fullHtml: string;

            if (body.type === "cv") {
                fullHtml = buildCVHtml({
                    htmlContent: body.htmlContent,
                    showFoto: body.showFoto,
                    fotoUrl: body.fotoUrl,
                    showSignatur: body.showSignatur,
                    signaturUrl: body.signaturUrl,
                    stadt: body.stadt,
                });
            } else {
                fullHtml = buildAnschreibenHtml({
                    htmlContent: body.htmlContent,
                    showSignatur: body.showSignatur,
                    signaturUrl: body.signaturUrl,
                    stadt: body.stadt,
                });
            }

            // Render the HTML to PDF
            const pdfBuffer = await renderPdf({ html: fullHtml });

            const durationMs = Date.now() - startTime;
            console.log(
                `PDF generated: type=${body.type} user=${req.userId} size=${pdfBuffer.length} duration=${durationMs}ms`
            );

            // Send the PDF as a binary response
            const fileName =
                body.type === "cv" ? "Lebenslauf.pdf" : "Anschreiben.pdf";

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${fileName}"`
            );
            res.setHeader("Content-Length", pdfBuffer.length.toString());
            res.send(pdfBuffer);
        } catch (error) {
            const durationMs = Date.now() - startTime;
            console.error(
                `PDF generation failed after ${durationMs}ms:`,
                error
            );
            res.status(500).json({
                error: "PDF-Erstellung fehlgeschlagen. Bitte versuchen Sie es erneut.",
            });
        }
    }
);

// ── Start Server ────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`🟢 Klaro PDF Service running on port ${PORT}`);
});

// ── Graceful Shutdown ───────────────────────────────────────────────────────
async function shutdown(signal: string) {
    console.log(`\n${signal} received. Shutting down...`);
    server.close();
    await closeBrowser();
    process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

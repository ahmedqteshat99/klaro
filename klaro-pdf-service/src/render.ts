import puppeteer, { type Browser, type Page } from "puppeteer";

let browser: Browser | null = null;

/**
 * Get or create a persistent Puppeteer browser instance.
 * Reusing the browser avoids the ~2s cold start of launching Chromium per request.
 */
async function getBrowser(): Promise<Browser> {
    if (browser && browser.connected) {
        return browser;
    }

    console.log("Launching Puppeteer browser...");
    browser = await puppeteer.launch({
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--font-render-hinting=none",
        ],
    });

    // Relaunch if the browser crashes
    browser.on("disconnected", () => {
        console.warn("Browser disconnected, will relaunch on next request");
        browser = null;
    });

    return browser;
}

export interface RenderPdfOptions {
    html: string;
    /** Timeout in ms for page rendering. Default: 15000 */
    timeout?: number;
}

/**
 * Render a full HTML document to a PDF buffer using Puppeteer.
 * Creates a new page per request and closes it after rendering.
 */
export async function renderPdf({
    html,
    timeout = 15_000,
}: RenderPdfOptions): Promise<Buffer> {
    const instance = await getBrowser();
    let page: Page | null = null;

    try {
        page = await instance.newPage();

        // Set viewport to A4-ish dimensions for consistent rendering
        await page.setViewport({ width: 794, height: 1122 });

        // Load the HTML content
        await page.setContent(html, {
            waitUntil: "networkidle0",
            timeout,
        });

        // Wait a bit for fonts to load from Google Fonts
        await page.evaluateHandle(() => document.fonts.ready);

        // Generate the PDF
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            preferCSSPageSize: true,
        });

        return Buffer.from(pdfBuffer);
    } finally {
        if (page) {
            await page.close().catch(() => { });
        }
    }
}

/**
 * Gracefully close the browser instance (for shutdown).
 */
export async function closeBrowser(): Promise<void> {
    if (browser) {
        await browser.close().catch(() => { });
        browser = null;
    }
}

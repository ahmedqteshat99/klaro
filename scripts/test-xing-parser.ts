import * as fs from 'fs';

// Read the test HTML
const testData = JSON.parse(fs.readFileSync('/tmp/xing-test.json', 'utf-8'));
const html = testData.html;

function cleanText(raw: string): string {
    return raw
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

interface ScrapedJob {
    title: string;
    link: string;
    company: string;
    location: string;
    guid: string;
}

function parseXingPage(html: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    // XING uses structured data - extract from JSON-LD
    const jsonLdRegex = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
    let match;

    while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
            const data = JSON.parse(match[1]);

            // Check if it's a JobPosting
            if (data["@type"] === "JobPosting" || data["@graph"]?.[0]?.["@type"] === "JobPosting") {
                const jobData = data["@type"] === "JobPosting" ? data : data["@graph"]?.[0];

                const title = jobData.title || "";
                const url = jobData.url || "";

                if (!title || !url || seen.has(url)) continue;

                // Filter for Assistenzarzt positions
                const lowerTitle = title.toLowerCase();
                if (
                    lowerTitle.includes("assistenzarzt") ||
                    lowerTitle.includes("assistenzärztin") ||
                    lowerTitle.includes("arzt in weiterbildung")
                ) {
                    seen.add(url);

                    const company = jobData.hiringOrganization?.name || "";
                    const location = jobData.jobLocation?.address?.addressLocality ||
                                   jobData.jobLocation?.address?.addressRegion || "";

                    jobs.push({
                        title: cleanText(title),
                        link: url,
                        company: cleanText(company),
                        location: cleanText(location),
                        guid: url,
                    });
                }
            }
        } catch (e) {
            // Skip invalid JSON
        }
    }

    // Fallback: Parse HTML structure if JSON-LD not available
    if (jobs.length === 0) {
        // XING job links pattern: <a href="/jobs/..." aria-label="Job Title">
        // Title is in aria-label attribute, not link text
        const linkRegex = /<a[^>]+href="((?:https:\/\/www\.xing\.com)?\/jobs\/[^"]+)"[^>]*aria-label="([^"]+)"[^>]*>/g;

        while ((match = linkRegex.exec(html)) !== null) {
            let urlPath = match[1];
            const ariaLabel = match[2];

            // Convert relative URL to absolute
            const url = urlPath.startsWith('http')
                ? urlPath
                : `https://www.xing.com${urlPath}`;

            if (seen.has(url)) continue;

            // Title is in aria-label attribute
            const title = cleanText(ariaLabel);

            if (!title || title.length < 10) continue;

            // Filter for Assistenzarzt
            const lowerTitle = title.toLowerCase();
            if (
                lowerTitle.includes("assistenzarzt") ||
                lowerTitle.includes("assistenzärztin") ||
                lowerTitle.includes("arzt in weiterbildung")
            ) {
                seen.add(url);
                jobs.push({
                    title,
                    link: url,
                    company: "",
                    location: "",
                    guid: url,
                });
            }
        }
    }

    return jobs;
}

const jobs = parseXingPage(html);
console.log(`Found ${jobs.length} XING jobs`);
console.log('\nFirst 5 jobs:');
jobs.slice(0, 5).forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   Link: ${job.link}`);
    console.log(`   Company: ${job.company || 'N/A'}`);
    console.log(`   Location: ${job.location || 'N/A'}`);
    console.log('');
});

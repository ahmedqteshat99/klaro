#!/usr/bin/env node

/**
 * Test PraktischArzt scraper locally to diagnose import issues
 */

async function cleanText(raw) {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePraktischArztPage(html) {
  const jobs = [];
  const jobBlockRegex = /<div\s+id="job-\d+"[^>]*class="[^"]*box-job[^"]*"[^>]*>/g;
  const blockStarts = [];
  let blockMatch;
  while ((blockMatch = jobBlockRegex.exec(html)) !== null) {
    blockStarts.push(blockMatch.index);
  }

  for (let i = 0; i < blockStarts.length; i++) {
    const start = blockStarts[i];
    const end = i + 1 < blockStarts.length ? blockStarts[i + 1] : Math.min(start + 5000, html.length);
    const block = html.substring(start, end);

    const linkMatch = block.match(/href="(https:\/\/www\.praktischarzt\.de\/job\/[^"]+)"/);
    if (!linkMatch) continue;
    const link = linkMatch[1];

    if (jobs.some((j) => j.guid === link)) continue;

    const titleMatch = block.match(/class="title-link\s+title\s+desktop_show"[^>]*>\s*([^<]+?)\s*<\/a>/);
    const title = titleMatch ? titleMatch[1].trim() : "";
    if (!title) continue;

    const companyMatch = block.match(/class="employer-name"[^>]*>.*?<\/i>\s*([^<]+)<\/a>/);
    const company = companyMatch ? companyMatch[1].trim() : "";

    const locationMatch = block.match(/class="svg-location"[^>]*>.*?<\/svg><\/span>([^<]+)/);
    const location = locationMatch ? locationMatch[1].trim() : "";

    jobs.push({ title, link, company, location, guid: link });
  }

  return jobs;
}

async function main() {
  const baseUrl = "https://www.praktischarzt.de/assistenzarzt/";
  const maxPages = 5;

  console.log("Testing PraktischArzt scraper...\n");

  let totalJobs = 0;
  const allGuids = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}${page}/`;
    console.log(`Page ${page}: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; KlaroBot/1.0)",
          "Accept": "text/html",
          "Accept-Language": "de-DE,de;q=0.9,en;q=0.5",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        console.log(`  HTTP ${response.status} - stopping\n`);
        break;
      }

      const html = await response.text();
      const jobs = parsePraktischArztPage(html);

      console.log(`  Found ${jobs.length} jobs:`);
      for (const job of jobs) {
        const isNew = !allGuids.has(job.guid);
        allGuids.add(job.guid);
        console.log(`    ${isNew ? "NEW" : "DUP"} | ${job.title.substring(0, 60)}...`);
        console.log(`        Company: ${job.company || "(empty)"} | Location: ${job.location || "(empty)"}`);
        console.log(`        URL: ${job.guid}`);
      }
      totalJobs += jobs.length;
      console.log();

      if (jobs.length === 0) break;

      // Polite delay
      if (page < maxPages) await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.log(`  Error: ${err.message}\n`);
      break;
    }
  }

  console.log(`\nTotal: ${totalJobs} jobs across ${maxPages} pages, ${allGuids.size} unique`);
}

main().catch(console.error);

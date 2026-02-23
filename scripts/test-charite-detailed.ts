import * as cheerio from "cheerio";

async function testCharite() {
  const url = "https://karriere.charite.de/";
  
  console.log(`\n🔍 Testing Charité scraping logic...\n`);
  console.log(`Step 1: Fetch landing page: ${url}`);
  
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Count job links
  let jobLinksFound = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const fullUrl = href.startsWith("http") ? href : new URL(href, url).toString();
    if (/\/(stelle|job|position)(?:n|angebot)?\/[^\/]+|\/detail\/\d+|\/anzeige\/\d+/i.test(fullUrl)) {
      jobLinksFound++;
    }
  });
  
  console.log(`Step 2: Found ${jobLinksFound} job links on landing page`);
  
  // Look for job listing page
  console.log(`Step 3: Looking for job listing page link...`);
  
  let found: Array<{text: string, href: string}> = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().toLowerCase().trim();
    
    if (
      text.includes("stellenangebote") ||
      text.includes("offene stellen") ||
      (text.includes("jobs") && text.length < 30) ||
      /^\/(stellenangebote|jobs|offene-stellen)/i.test(href)
    ) {
      const fullUrl = href.startsWith("http") ? href : new URL(href, url).toString();
      found.push({text, href: fullUrl});
    }
  });
  
  console.log(`  Found ${found.length} potential job listing links:`);
  found.slice(0, 5).forEach(({text, href}) => {
    console.log(`    "${text}" -> ${href}`);
  });
  
  if (found.length > 0) {
    const jobListingUrl = found[0].href;
    console.log(`\nStep 4: Fetching job listing page: ${jobListingUrl}`);
    const listingResponse = await fetch(jobListingUrl);
    const listingHtml = await listingResponse.text();
    const $listing = cheerio.load(listingHtml);
    
    // Count job detail links
    let detailLinks: string[] = [];
    $listing("a[href]").each((_, el) => {
      const href = $listing(el).attr("href");
      if (!href) return;
      if (/\/detail\/\d+|\/stellenangebote\/[^\/]+/i.test(href)) {
        if (!detailLinks.includes(href)) {
          detailLinks.push(href);
        }
      }
    });
    console.log(`  Total unique detail links found: ${detailLinks.length}`);
    console.log(`  Sample links:`);
    detailLinks.slice(0, 5).forEach(link => console.log(`    ${link}`));
  } else {
    console.log(`\n❌ No job listing page link found!`);
  }
}

testCharite();

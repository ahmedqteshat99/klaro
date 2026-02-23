async function testCharite() {
  const url = 'https://karriere.charite.de/';
  
  console.log(`Testing Charité scraper manually...\n`);
  console.log(`URL: ${url}\n`);
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    console.log(`Page size: ${html.length} bytes`);
    console.log(`Contains "assistenzarzt": ${html.toLowerCase().includes('assistenzarzt')}`);
    console.log(`Contains "stelle": ${html.toLowerCase().includes('stelle')}`);
    console.log(`Contains "job": ${html.toLowerCase().includes('job')}`);
    
    // Try to find job links
    const jobLinkPatterns = [
      /href="([^"]*(?:stelle|job|position)[^"]*)"/gi,
      /href="([^"]*assistenzarzt[^"]*)"/gi,
    ];
    
    console.log(`\nSearching for job links...`);
    
    for (const pattern of jobLinkPatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        console.log(`\nFound ${matches.length} matches for pattern: ${pattern}`);
        matches.slice(0, 5).forEach(m => console.log(`  - ${m[1]}`));
      }
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testCharite();

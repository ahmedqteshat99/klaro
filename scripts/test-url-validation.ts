// Test why URLs are being rejected

async function testValidation() {
  // These are likely URLs from University hospitals based on common patterns
  const testUrls = [
    'https://www.asklepios.com/karriere/stellenangebote/detail/12345',
    'https://www.ukm.de/karriere/stellenangebote/detail/123',
    'https://www.uni-muenster.de/de/jobs/stelle/assistenzarzt',
  ];
  
  console.log('Testing URL pattern validation...\n');
  
  for (const url of testUrls) {
    console.log(`\nURL: ${url}`);
    
    // Test URL pattern
    const hasJobIndicator =
      /\/(job|stelle|position|vacancy)[/-]?\d+/i.test(url) ||
      /\/(assistenzarzt|arzt|facharzt|oberarzt)[/-][a-z0-9-]+/i.test(url) ||
      /softgarden.*\/job\//i.test(url) ||
      /personio.*\/job\//i.test(url) ||
      /rexx.*\/jobs\//i.test(url) ||
      /successfactors.*\/jobReq/i.test(url) ||
      /\/(anzeige|detail|view)[/-]?\d+/i.test(url) ||
      (/\/(stelle|job|position)[ns]?\/[^\/]+/i.test(url) && !/\/(stelle|job|position)[ns]?\/?$/i.test(url)) ||
      (/assistenzarzt/i.test(url) && url.split('/').length > 4);
    
    console.log(`  Pattern check: ${hasJobIndicator ? '✅ PASS' : '❌ FAIL'}`);
    
    // Test blacklist
    const blacklistPatterns = [
      /\/karriere\/?$/i,
      /\/jobs\/?$/i,
      /\/stellenangebote\/?$/i,
    ];
    
    const blacklisted = blacklistPatterns.some(p => p.test(url));
    console.log(`  Blacklist check: ${blacklisted ? '❌ BLOCKED' : '✅ PASS'}`);
  }
  
  // Now test the actual pattern from the scraper
  console.log('\n\nTesting real-world URLs (from scraper output)...');
  console.log('Need to check Supabase logs for actual URLs being rejected');
}

testValidation();

async function testSoftgarden() {
  const url = 'https://www.uniklinik-freiburg.de/karriere/stellenangebote.html';
  
  console.log(`Testing Softgarden scraper for: ${url}\n`);
  
  // Extract tenant from URL
  const urlObj = new URL(url);
  const tenant = urlObj.hostname.split('.')[0];
  
  console.log(`Tenant: ${tenant}`);
  
  // Try Softgarden API
  const apiUrl = `https://${tenant}.softgarden.io/api/job-offers`;
  console.log(`API URL: ${apiUrl}\n`);
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data: any = await response.json();
      console.log(`Found ${data.length} jobs total\n`);
      
      // Filter for Assistenzarzt
      const assistenzarzt = data.filter((job: any) => {
        const title = (job.title || job.name || '').toLowerCase();
        return title.includes('assistenzarzt') || title.includes('arzt in weiterbildung');
      });
      
      console.log(`Assistenzarzt positions: ${assistenzarzt.length}`);
      assistenzarzt.slice(0, 3).forEach((job: any) => {
        console.log(`  - ${job.title || job.name}`);
      });
    } else {
      console.log('API not accessible - might not be a Softgarden site');
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testSoftgarden();

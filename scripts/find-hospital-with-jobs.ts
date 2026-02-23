import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfmgdvjwmoxoeqmcarbv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw'
);

async function findHospitalsWithPlatforms() {
  console.log('🔍 Looking for hospitals with different platforms...\n');
  
  // Get hospitals by platform
  const platforms = ['softgarden', 'personio', 'custom', 'cms'];
  
  for (const platform of platforms) {
    const { data } = await supabase
      .from('hospitals')
      .select('name, career_page_url, career_platform')
      .eq('career_platform', platform)
      .not('career_page_url', 'is', null)
      .limit(3);
    
    if (data && data.length > 0) {
      console.log(`\n📊 ${platform.toUpperCase()} hospitals:`);
      data.forEach(h => {
        console.log(`  - ${h.name}`);
        console.log(`    ${h.career_page_url}`);
      });
    }
  }
  
  // Check if any jobs exist
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'hospital_scrape');
  
  console.log(`\n📈 Total jobs from hospital scraper: ${count || 0}`);
}

findHospitalsWithPlatforms();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function investigate() {
  // Check total hospitals
  const { count: totalHospitals } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total hospitals in database: ${totalHospitals}`);

  // Check hospitals with career pages
  const { data: withCareerPages, count: withCareerCount } = await supabase
    .from('hospitals')
    .select('name, career_page_url, last_scraped_at, scrape_attempts')
    .not('career_page_url', 'is', null)
    .order('scrape_attempts', { ascending: false })
    .limit(20);

  console.log(`\n🔗 Hospitals with career pages: ${withCareerCount}`);
  console.log('\nTop 20 by scrape attempts:');
  withCareerPages?.forEach((h, i) => {
    console.log(`${i + 1}. ${h.name}`);
    console.log(`   URL: ${h.career_page_url}`);
    console.log(`   Attempts: ${h.scrape_attempts || 0}, Last: ${h.last_scraped_at || 'never'}\n`);
  });

  // Check hospitals without career pages
  const { count: withoutCareerCount } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true })
    .is('career_page_url', null);

  console.log(`❌ Hospitals WITHOUT career pages: ${withoutCareerCount}`);

  // Check scraping success rate
  const { data: scrapeStats } = await supabase
    .from('hospitals')
    .select('scrape_attempts, last_scrape_job_count')
    .not('career_page_url', 'is', null);

  const totalAttempts = scrapeStats?.reduce((sum, h) => sum + (h.scrape_attempts || 0), 0) || 0;
  const totalJobsFound = scrapeStats?.reduce((sum, h) => sum + (h.last_scrape_job_count || 0), 0) || 0;

  console.log(`\n📈 Scraping Statistics:`);
  console.log(`   Total attempts: ${totalAttempts}`);
  console.log(`   Total jobs found: ${totalJobsFound}`);
  console.log(`   Success rate: ${totalAttempts > 0 ? ((totalJobsFound / totalAttempts) * 100).toFixed(2) : 0}%`);
}

investigate();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfmgdvjwmoxoeqmcarbv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw'
);

async function getScrapingStats() {
  console.log('📊 Hospital Scraping Statistics\n');
  console.log('='.repeat(60));
  
  // Total hospitals
  const { count: totalHospitals } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true });
  
  // Hospitals that have been scraped
  const { count: scrapedHospitals } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true })
    .not('last_scraped_at', 'is', null);
  
  // Hospitals with career URLs
  const { count: withUrls } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true })
    .not('career_page_url', 'is', null);
  
  // Total scrape attempts
  const { data: scrapeData } = await supabase
    .from('hospitals')
    .select('scrape_success_count, scrape_error_count')
    .not('last_scraped_at', 'is', null);
  
  const totalAttempts = scrapeData?.reduce((sum, h: any) => 
    sum + (h.scrape_success_count || 0) + (h.scrape_error_count || 0), 0) || 0;
  
  const totalSuccesses = scrapeData?.reduce((sum, h: any) => 
    sum + (h.scrape_success_count || 0), 0) || 0;
  
  // Jobs from hospital scraper
  const { count: hospitalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'hospital_scrape');
  
  // Jobs from RSS/job boards
  const { count: rssJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .in('rss_feed_source', [
      'stellenmarkt_medizin',
      'aerzteblatt',
      'praktischarzt',
      'medijobs',
      'jobvector',
      'aerztezeitung_jobs'
    ]);
  
  // Get sample of most scraped hospitals
  const { data: topScraped } = await supabase
    .from('hospitals')
    .select('name, scrape_success_count, last_scraped_at')
    .not('last_scraped_at', 'is', null)
    .order('scrape_success_count', { ascending: false })
    .limit(5);
  
  console.log('\n🏥 HOSPITALS:');
  console.log(`   Total hospitals in database: ${totalHospitals}`);
  console.log(`   With career page URLs: ${withUrls}`);
  console.log(`   Successfully scraped: ${scrapedHospitals}`);
  
  console.log('\n🔄 SCRAPING ACTIVITY:');
  console.log(`   Total scrape attempts: ${totalAttempts}`);
  console.log(`   Successful scrapes: ${totalSuccesses}`);
  console.log(`   Success rate: ${totalSuccesses && totalAttempts ? ((totalSuccesses/totalAttempts)*100).toFixed(1) : 0}%`);
  
  console.log('\n💼 JOBS FOUND:');
  console.log(`   From hospital scraper: ${hospitalJobs || 0} jobs`);
  console.log(`   From job boards (RSS): ${rssJobs || 0} jobs`);
  console.log(`   Total: ${(hospitalJobs || 0) + (rssJobs || 0)} jobs`);
  
  console.log('\n📈 CONVERSION RATE:');
  const conversionRate = scrapedHospitals && hospitalJobs 
    ? ((hospitalJobs / scrapedHospitals) * 100).toFixed(2)
    : '0.00';
  console.log(`   ${hospitalJobs} jobs ÷ ${scrapedHospitals} hospitals = ${conversionRate}% have jobs`);
  
  console.log('\n🏆 TOP SCRAPED HOSPITALS:');
  topScraped?.forEach((h: any, i) => {
    const lastScraped = new Date(h.last_scraped_at).toLocaleDateString();
    console.log(`   ${i+1}. ${h.name}`);
    console.log(`      Scraped ${h.scrape_success_count} times (last: ${lastScraped})`);
  });
  
  console.log('\n' + '='.repeat(60));
}

getScrapingStats();

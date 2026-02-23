import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkStats() {
  const { data, error } = await supabase
    .from('hospitals')
    .select('name, career_page_url, career_platform, last_scraped_at, last_scrape_success, scrape_success_count, scrape_error_count, last_error_message, job_postings_count')
    .not('career_page_url', 'is', null)
    .order('last_scraped_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Scraping statistics for 29 hospitals WITH career pages:\n`);
  
  let scraped = 0;
  let notScraped = 0;
  let withJobs = 0;
  
  data.forEach((h, i) => {
    if (h.last_scraped_at) {
      scraped++;
      if (h.job_postings_count > 0) withJobs++;
    } else {
      notScraped++;
    }
    
    console.log(`${i + 1}. ${h.name}`);
    console.log(`   Platform: ${h.career_platform || 'unknown'}`);
    console.log(`   Last scraped: ${h.last_scraped_at || 'NEVER'}`);
    console.log(`   Success: ${h.scrape_success_count || 0}, Errors: ${h.scrape_error_count || 0}`);
    console.log(`   Jobs found: ${h.job_postings_count || 0}`);
    if (h.last_error_message) {
      console.log(`   Last error: ${h.last_error_message.substring(0, 100)}`);
    }
    console.log('');
  });

  console.log(`\n📈 Summary:`);
  console.log(`   Scraped at least once: ${scraped}`);
  console.log(`   Never scraped: ${notScraped}`);
  console.log(`   Found jobs: ${withJobs}`);
}

checkStats();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfmgdvjwmoxoeqmcarbv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw'
);

async function checkJobs() {
  const { count: hospitalJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'hospital_scrape');
  
  const { count: rssJobs } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .in('rss_feed_source', ['stellenmarkt_medizin', 'aerzteblatt', 'praktischarzt', 'medijobs', 'jobvector', 'aerztezeitung_jobs']);
  
  console.log(`📊 Total Jobs:`);
  console.log(`   Hospital Scraper: ${hospitalJobs}`);
  console.log(`   Job Boards (RSS): ${rssJobs}`);
  console.log(`   Total: ${(hospitalJobs || 0) + (rssJobs || 0)}`);
}

checkJobs();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAllJobs() {
  // Check for the bad jobs that were there before
  const { data: badJobs, error: badError } = await supabase
    .from('jobs')
    .select('id, title, hospital_name, source')
    .or('title.ilike.%Jetzt bewerben%,title.ilike.%Pflegefachkraft%');

  if (badError) {
    console.error('Error checking bad jobs:', badError);
  } else {
    console.log(`\n❌ Bad jobs still in database: ${badJobs.length}`);
    badJobs.forEach(job => {
      console.log(`   - "${job.title}" at ${job.hospital_name} (source: ${job.source})`);
    });
  }

  // Check all hospital scrape jobs
  const { data: hospitalJobs, error: hospitalError } = await supabase
    .from('jobs')
    .select('id, title, hospital_name, created_at')
    .eq('source', 'hospital_scrape')
    .order('created_at', { ascending: false });

  if (hospitalError) {
    console.error('Error checking hospital jobs:', hospitalError);
  } else {
    console.log(`\n✅ Valid hospital scrape jobs: ${hospitalJobs.length}`);
    hospitalJobs.forEach((job, i) => {
      console.log(`   ${i + 1}. "${job.title}" at ${job.hospital_name}`);
    });
  }

  // Total jobs count
  const { count, error: countError } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\n📊 Total jobs in database: ${count}`);
  }
}

checkAllJobs();

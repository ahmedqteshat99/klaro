import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('id, title, hospital_name, source, created_at')
    .eq('source', 'hospital_scrape')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n📊 Hospital scrape jobs in database: ${data.length}\n`);
  data.forEach((job, i) => {
    console.log(`${i + 1}. "${job.title}" at ${job.hospital_name}`);
  });
}

checkJobs();

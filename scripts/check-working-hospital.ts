import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://sfmgdvjwmoxoeqmcarbv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw');

async function check() {
  // Get Brandenburg hospital that found jobs
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('*')
    .eq('name', 'Städtisches Klinikum Brandenburg')
    .single();
  
  console.log('\n✅ Hospital that FOUND jobs:');
  console.log(`Name: ${hospital.name}`);
  console.log(`Career URL: ${hospital.career_page_url}`);
  console.log(`Platform: ${hospital.career_platform}`);
  console.log(`Jobs found: ${hospital.job_postings_count}\n`);

  // Get the actual jobs from this hospital
  const { data: jobs } = await supabase
    .from('jobs')
    .select('title, apply_url')
    .eq('hospital_name', 'Städtisches Klinikum Brandenburg');

  console.log('Jobs in database:');
  jobs?.forEach((job, i) => {
    console.log(`${i + 1}. "${job.title}"`);
    console.log(`   URL: ${job.apply_url}\n`);
  });
}

check();

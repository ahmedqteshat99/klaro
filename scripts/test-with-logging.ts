import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://sfmgdvjwmoxoeqmcarbv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw'
);

async function testWithLogging() {
  console.log('🏥 Testing scraper with detailed logging...\n');
  
  // Manually set a hospital that found jobs
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('*')
    .eq('name', 'Asklepios Klinik Barmbek')
    .single();
  
  if (!hospital) {
    console.log('Hospital not found');
    return;
  }
  
  console.log(`Testing: ${hospital.name}`);
  console.log(`Career URL: ${hospital.career_page_url}\n`);
  
  // Invoke the function
  const { data, error } = await supabase.functions.invoke('scrape-hospital-jobs', {
    body: {}
  });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('\nResult:', JSON.stringify(data, null, 2));
  }
}

testWithLogging();

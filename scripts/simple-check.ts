import { createClient } from '@supabase/supabase-js';

// Use anon key to check table structure
const supabase = createClient(
  'https://sfmgdvjwmoxoeqmcarbv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw'
);

async function check() {
  console.log('Checking hospitals table...\n');
  
  const { data, error, count } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact' })
    .limit(3);
  
  console.log('Error:', error);
  console.log('Count:', count);
  console.log('Data:', data);
  
  if (!error && count === 0) {
    console.log('\n✅ Table exists but is EMPTY - migrations need to be run!');
  }
}

check();

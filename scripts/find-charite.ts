import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://sfmgdvjwmoxoeqmcarbv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw');

async function find() {
  const { data } = await supabase
    .from('hospitals')
    .select('id, name, career_page_url, career_platform')
    .ilike('name', '%charit%');
  
  console.log(JSON.stringify(data, null, 2));
}

find();

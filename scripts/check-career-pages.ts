import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  // Get hospitals WITH career pages
  const { data: withPages, error } = await supabase
    .from('hospitals')
    .select('*')
    .not('career_page_url', 'is', null)
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\n✅ Sample hospitals WITH career pages:\n`);
  withPages.forEach((h, i) => {
    console.log(`${i + 1}. ${h.name}`);
    console.log(`   Career URL: ${h.career_page_url}`);
    console.log(`   All columns:`, Object.keys(h).join(', '));
    console.log('');
  });

  // Count totals
  const { count: withCount } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true })
    .not('career_page_url', 'is', null);

  const { count: withoutCount } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true })
    .is('career_page_url', null);

  console.log(`\n📊 Summary:`);
  console.log(`   Hospitals WITH career pages: ${withCount}`);
  console.log(`   Hospitals WITHOUT career pages: ${withoutCount}`);
  console.log(`   Total: ${(withCount || 0) + (withoutCount || 0)}`);
}

check();

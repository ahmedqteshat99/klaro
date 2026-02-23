import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '8f207cb76e501764d7805dafdeaa4bd4a146d32fb3be88e4da07555e9ec0cdb6';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCareerPages() {
  const { data: hospitals, error } = await supabase
    .from('hospitals')
    .select('name, website, career_page_url, career_platform, last_scrape_success')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('\n📊 Career Page Discovery Results:\n');
  console.log('═'.repeat(80));

  const found = hospitals?.filter(h => h.career_page_url) || [];
  const notFound = hospitals?.filter(h => !h.career_page_url) || [];

  console.log(`\n✅ Found career pages: ${found.length}/${hospitals?.length || 0}\n`);

  found.forEach(h => {
    console.log(`✓ ${h.name}`);
    console.log(`  Platform: ${h.career_platform || 'unknown'}`);
    console.log(`  URL: ${h.career_page_url}`);
    console.log();
  });

  if (notFound.length > 0) {
    console.log(`\n❌ No career page found: ${notFound.length}\n`);
    notFound.forEach(h => {
      console.log(`✗ ${h.name}`);
      console.log(`  Website: ${h.website}`);
      console.log();
    });
  }

  console.log('═'.repeat(80));
}

checkCareerPages();

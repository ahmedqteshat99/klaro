import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixAndTest() {
  console.log('🔍 Step 1: Checking database state...\n');
  
  // Check if hospitals table exists
  const { count, error } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Error accessing hospitals table:', error.message);
    console.log('\n💡 The hospitals table might not exist. Checking migrations...');
    return;
  }
  
  console.log(`✅ Hospitals table exists with ${count} records\n`);
  
  if (count === 0) {
    console.log('⚠️  No hospitals in database!');
    console.log('📝 This means the INSERT migrations haven\'t been run yet.');
    console.log('\n💡 You need to run the hospital seed migrations manually.');
    return;
  }
  
  // Check how many have career URLs
  const { data: withUrls } = await supabase
    .from('hospitals')
    .select('name, career_page_url')
    .not('career_page_url', 'is', null)
    .limit(5);
  
  console.log(`📊 Hospitals with career URLs: ${withUrls?.length || 0}`);
  if (withUrls && withUrls.length > 0) {
    withUrls.forEach(h => console.log(`  - ${h.name}`));
  }
  
  // Test the scraper
  console.log('\n🏥 Step 2: Testing hospital job scraper...\n');
  const { data: scraperResult, error: scraperError } = await supabase.functions.invoke('scrape-hospital-jobs');
  
  if (scraperError) {
    console.error('❌ Scraper error:', scraperError.message);
  } else {
    console.log('✅ Scraper result:', JSON.stringify(scraperResult, null, 2));
  }
}

fixAndTest();

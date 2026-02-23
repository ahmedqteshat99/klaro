/**
 * Manually trigger the hospital job scraper
 *
 * Usage: npx tsx scripts/trigger-hospital-scraper.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '8f207cb76e501764d7805dafdeaa4bd4a146d32fb3be88e4da07555e9ec0cdb6';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🚀 Triggering hospital job scraper...\n');

  try {
    const { data, error } = await supabase.functions.invoke('scrape-hospital-jobs', {
      body: {}
    });

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('✅ Scraper completed successfully!\n');
    console.log('Results:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();

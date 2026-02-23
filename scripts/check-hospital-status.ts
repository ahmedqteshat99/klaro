/**
 * Check Hospital Status
 * Shows how many hospitals have career pages discovered
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '8f207cb76e501764d7805dafdeaa4bd4a146d32fb3be88e4da07555e9ec0cdb6';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('\n📊 Hospital Status Report\n');

  // Total hospitals
  const { data: allHospitals } = await supabase
    .from('hospitals')
    .select('id, career_page_url, last_scraped_at')
    .eq('is_active', true);

  const total = allHospitals?.length || 0;
  const withCareer = allHospitals?.filter(h => h.career_page_url).length || 0;
  const withoutCareer = allHospitals?.filter(h => !h.career_page_url).length || 0;
  const scraped = allHospitals?.filter(h => h.last_scraped_at).length || 0;

  console.log(`Total Active Hospitals: ${total}`);
  console.log(`With Career Pages: ${withCareer} (${((withCareer / total) * 100).toFixed(1)}%)`);
  console.log(`Without Career Pages: ${withoutCareer} (${((withoutCareer / total) * 100).toFixed(1)}%)`);
  console.log(`Scraped at Least Once: ${scraped} (${((scraped / total) * 100).toFixed(1)}%)`);

  console.log(`\n✅ Only ${withCareer} hospitals can be scraped for jobs right now.`);
  console.log(`⚠️  Need to run career discovery for remaining ${withoutCareer} hospitals.\n`);
}

main();

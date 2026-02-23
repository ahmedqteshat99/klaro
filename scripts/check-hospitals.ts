import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '8f207cb76e501764d7805dafdeaa4bd4a146d32fb3be88e4da07555e9ec0cdb6';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkHospitals() {
  const { data: withUrls, error: error1 } = await supabase
    .from('hospitals')
    .select('name, career_page_url, career_platform')
    .not('career_page_url', 'is', null)
    .limit(10);

  const { data: withoutUrls, error: error2 } = await supabase
    .from('hospitals')
    .select('count');

  console.log('✅ Hospitals with career URLs:', withUrls?.length || 0);
  if (withUrls && withUrls.length > 0) {
    withUrls.forEach(h => console.log(`  - ${h.name} (${h.career_platform}): ${h.career_page_url?.substring(0, 50)}...`));
  }

  console.log('\n📊 Total hospitals:', withoutUrls?.[0]?.count || 0);
}

checkHospitals();

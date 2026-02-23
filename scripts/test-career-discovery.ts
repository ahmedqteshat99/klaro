import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '8f207cb76e501764d7805dafdeaa4bd4a146d32fb3be88e4da07555e9ec0cdb6';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testCareerDiscovery() {
  console.log('🔍 Calling career page discovery function...\n');

  const { data, error } = await supabase.functions.invoke('discover-career-pages', {
    body: {},
    headers: {
      'x-cron-secret': 'd085d45aef36d9b077247ecf4ed24e865c2ae28c809ef34a599d4f6572d606c5'
    }
  });

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Success!\n');
  console.log(JSON.stringify(data, null, 2));
}

testCareerDiscovery();

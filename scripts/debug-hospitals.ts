import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = '8f207cb76e501764d7805dafdeaa4bd4a146d32fb3be88e4da07555e9ec0cdb6';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function debug() {
  const { data: hospitals, error: hospError, count } = await supabase
    .from('hospitals')
    .select('*', { count: 'exact' })
    .limit(5);

  console.log('Error:', hospError?.message || 'none');
  console.log('Count:', count);
  console.log('Sample hospitals:', JSON.stringify(hospitals?.map(h => h.name), null, 2));
}

debug();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk2MTk5MywiZXhwIjoyMDg1NTM3OTkzfQ.P88qBrcx-xmcxRcvG9kgfr3RMVO6BQr6_11xBIIJhf0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testCharite() {
  console.log('🧪 Testing Charité scraper with verbose logging...\n');

  const { data, error } = await supabase.functions.invoke('scrape-hospital-jobs', {
    body: { 
      hospitalId: 'please find charité id and test it',
      verbose: true 
    }
  });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log('\n📊 Result:');
  console.log(JSON.stringify(data, null, 2));
}

testCharite();

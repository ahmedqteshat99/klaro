import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTk2MTk5MywiZXhwIjoyMDg1NTM3OTkzfQ.tYo53a2yRnHokD-yAL2OfNUQh5-dMSbYHSMaArAKrvo';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function applyMigrations() {
  console.log('🚀 Applying hospital migrations manually...\n');
  
  const migrations = [
    '20260221000000_hospitals_table.sql',
    '20260221030000_seed_university_hospitals.sql',
    '20260222000000_expand_hospital_database.sql',
  ];
  
  for (const migration of migrations) {
    const path = join('/Users/ahmedquteishat/Documents/asssitenzarztcv/assistenzarzt-pro-main/supabase/migrations', migration);
    console.log(`📝 Applying ${migration}...`);
    
    try {
      const sql = readFileSync(path, 'utf-8');
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error(`  ❌ Error:`, error.message);
      } else {
        console.log(`  ✅ Applied successfully`);
      }
    } catch (e: any) {
      console.error(`  ❌ Failed:`, e.message);
    }
  }
  
  // Verify
  console.log('\n🔍 Verifying hospitals...');
  const { count } = await supabase.from('hospitals').select('*', { count: 'exact', head: true });
  console.log(`✅ Found ${count} hospitals in database`);
}

applyMigrations();

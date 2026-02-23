/**
 * Bulk Career Page Discovery
 *
 * Runs multiple career discovery cycles to find career pages for all hospitals
 *
 * Usage: npx tsx scripts/bulk-career-discovery.ts [cycles]
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

interface CycleResult {
  cycleNumber: number;
  hospitalsProcessed: number;
  careerPagesFound: number;
  duration: number;
}

async function runDiscoveryCycle(cycleNumber: number): Promise<CycleResult> {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 Cycle ${cycleNumber} - Discovering career pages...`);
  console.log(`${'='.repeat(80)}`);

  const { data, error } = await supabase.functions.invoke('discover-career-pages', {
    body: {}
  });

  const duration = Date.now() - startTime;

  if (error) {
    console.error(`❌ Cycle ${cycleNumber} failed:`, error);
    return {
      cycleNumber,
      hospitalsProcessed: 0,
      careerPagesFound: 0,
      duration
    };
  }

  const result: CycleResult = {
    cycleNumber,
    hospitalsProcessed: data.processed || 0,
    careerPagesFound: data.found || 0,
    duration
  };

  console.log(`✅ Cycle ${cycleNumber} complete:`);
  console.log(`   Hospitals Processed: ${result.hospitalsProcessed}`);
  console.log(`   Career Pages Found: ${result.careerPagesFound}`);
  console.log(`   Success Rate: ${result.hospitalsProcessed > 0 ? ((result.careerPagesFound / result.hospitalsProcessed) * 100).toFixed(1) : 0}%`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);

  // Show platform breakdown if available
  if (data.byPlatform) {
    console.log(`\n   📋 By Platform:`);
    Object.entries(data.byPlatform).forEach(([platform, count]) => {
      console.log(`      • ${platform}: ${count}`);
    });
  }

  return result;
}

async function main() {
  const cycles = parseInt(process.argv[2] || '10', 10);

  console.log(`\n🔍 Bulk Career Page Discovery`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`🔢 Running ${cycles} cycles (50 hospitals each)`);
  console.log(`📊 Expected coverage: ${cycles * 50} hospitals\n`);

  const results: CycleResult[] = [];
  let totalHospitals = 0;
  let totalFound = 0;

  for (let i = 1; i <= cycles; i++) {
    const result = await runDiscoveryCycle(i);
    results.push(result);

    totalHospitals += result.hospitalsProcessed;
    totalFound += result.careerPagesFound;

    // Delay between cycles (3 seconds - career discovery is slower)
    if (i < cycles) {
      console.log(`\n⏸  Waiting 3 seconds before next cycle...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 BULK DISCOVERY SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Cycles Run: ${cycles}`);
  console.log(`Hospitals Processed: ${totalHospitals}`);
  console.log(`Career Pages Found: ${totalFound}`);
  console.log(`Not Found: ${totalHospitals - totalFound}`);
  console.log(`Success Rate: ${totalHospitals > 0 ? ((totalFound / totalHospitals) * 100).toFixed(1) : 0}%`);

  // Per-cycle breakdown
  console.log(`\n📈 Per-Cycle Breakdown:\n`);
  results.forEach(r => {
    const successRate = r.hospitalsProcessed > 0
      ? ((r.careerPagesFound / r.hospitalsProcessed) * 100).toFixed(0)
      : 'N/A';
    console.log(
      `   Cycle ${r.cycleNumber.toString().padStart(2)}: ` +
      `${r.hospitalsProcessed.toString().padStart(2)} processed, ` +
      `${r.careerPagesFound.toString().padStart(2)} found ` +
      `(${successRate}% success) - ${(r.duration / 1000).toFixed(1)}s`
    );
  });

  // Check database stats
  console.log(`\n📊 Final Database Statistics:\n`);

  const { data: hospitalStats } = await supabase
    .from('hospitals')
    .select('id, career_page_url')
    .eq('is_active', true);

  const totalCount = hospitalStats?.length || 0;
  const withCareerPage = hospitalStats?.filter(h => h.career_page_url).length || 0;
  const withoutCareerPage = totalCount - withCareerPage;

  console.log(`   Total Active Hospitals: ${totalCount}`);
  console.log(`   With Career Pages: ${withCareerPage} (${((withCareerPage / totalCount) * 100).toFixed(1)}%)`);
  console.log(`   Without Career Pages: ${withoutCareerPage} (${((withoutCareerPage / totalCount) * 100).toFixed(1)}%)`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✨ Discovery complete!\n`);
}

main().catch(console.error);

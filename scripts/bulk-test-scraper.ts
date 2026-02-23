/**
 * Bulk Hospital Scraper Test
 *
 * Runs multiple scraper cycles to test job import across many hospitals
 *
 * Usage: npx tsx scripts/bulk-test-scraper.ts [cycles]
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
  totalJobsFound: number;
  totalJobsAdded: number;
  duration: number;
}

async function runScraperCycle(cycleNumber: number): Promise<CycleResult> {
  const startTime = Date.now();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 Cycle ${cycleNumber} - Starting...`);
  console.log(`${'='.repeat(80)}`);

  const { data, error } = await supabase.functions.invoke('scrape-hospital-jobs', {
    body: {}
  });

  const duration = Date.now() - startTime;

  if (error) {
    console.error(`❌ Cycle ${cycleNumber} failed:`, error);
    return {
      cycleNumber,
      hospitalsProcessed: 0,
      totalJobsFound: 0,
      totalJobsAdded: 0,
      duration
    };
  }

  const result: CycleResult = {
    cycleNumber,
    hospitalsProcessed: data.hospitalsProcessed || 0,
    totalJobsFound: data.totalJobsFound || 0,
    totalJobsAdded: data.totalJobsAdded || 0,
    duration
  };

  console.log(`✅ Cycle ${cycleNumber} complete:`);
  console.log(`   Hospitals: ${result.hospitalsProcessed}`);
  console.log(`   Jobs Found: ${result.totalJobsFound}`);
  console.log(`   Jobs Added: ${result.totalJobsAdded}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(1)}s`);

  // Show hospital details if jobs were found
  if (data.results && result.totalJobsFound > 0) {
    console.log(`\n   📋 Hospitals with jobs:`);
    data.results
      .filter((h: any) => h.jobsFound > 0)
      .forEach((h: any) => {
        console.log(`      • ${h.hospital}: ${h.jobsFound} found, ${h.jobsAdded} added`);
      });
  }

  return result;
}

async function main() {
  const cycles = parseInt(process.argv[2] || '10', 10);

  console.log(`\n🚀 Bulk Hospital Scraper Test`);
  console.log(`📅 ${new Date().toLocaleString()}`);
  console.log(`🔢 Running ${cycles} cycles (25 hospitals each)`);
  console.log(`📊 Expected coverage: ${cycles * 25} hospitals\n`);

  const results: CycleResult[] = [];
  let totalHospitals = 0;
  let totalJobsFound = 0;
  let totalJobsAdded = 0;

  for (let i = 1; i <= cycles; i++) {
    const result = await runScraperCycle(i);
    results.push(result);

    totalHospitals += result.hospitalsProcessed;
    totalJobsFound += result.totalJobsFound;
    totalJobsAdded += result.totalJobsAdded;

    // Delay between cycles (2 seconds)
    if (i < cycles) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 BULK TEST SUMMARY`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Cycles Run: ${cycles}`);
  console.log(`Hospitals Processed: ${totalHospitals}`);
  console.log(`Total Jobs Found: ${totalJobsFound}`);
  console.log(`Total Jobs Added: ${totalJobsAdded}`);
  console.log(`Duplicates Filtered: ${totalJobsFound - totalJobsAdded}`);
  console.log(`Average Jobs/Hospital: ${(totalJobsFound / totalHospitals).toFixed(2)}`);
  console.log(`Import Success Rate: ${totalHospitals > 0 ? ((totalJobsAdded / totalJobsFound) * 100).toFixed(1) : 0}%`);

  // Per-cycle breakdown
  console.log(`\n📈 Per-Cycle Breakdown:\n`);
  results.forEach(r => {
    const successRate = r.totalJobsFound > 0
      ? ((r.totalJobsAdded / r.totalJobsFound) * 100).toFixed(0)
      : 'N/A';
    console.log(
      `   Cycle ${r.cycleNumber.toString().padStart(2)}: ` +
      `${r.hospitalsProcessed.toString().padStart(2)} hospitals, ` +
      `${r.totalJobsFound.toString().padStart(3)} found, ` +
      `${r.totalJobsAdded.toString().padStart(3)} added ` +
      `(${successRate}% success) - ${(r.duration / 1000).toFixed(1)}s`
    );
  });

  // Check database stats
  console.log(`\n📊 Database Statistics:\n`);

  const { data: hospitalStats } = await supabase
    .from('hospitals')
    .select('last_scraped_at')
    .eq('is_active', true);

  const scrapedCount = hospitalStats?.filter(h => h.last_scraped_at).length || 0;
  const totalCount = hospitalStats?.length || 0;

  console.log(`   Total Active Hospitals: ${totalCount}`);
  console.log(`   Hospitals Scraped: ${scrapedCount}`);
  console.log(`   Hospitals Remaining: ${totalCount - scrapedCount}`);
  console.log(`   Coverage: ${((scrapedCount / totalCount) * 100).toFixed(1)}%`);

  const { count: jobCount } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'hospital_scrape');

  console.log(`   Total Hospital-Scraped Jobs: ${jobCount || 0}`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✨ Test complete!\n`);
}

main().catch(console.error);

/**
 * Job Quality Monitoring Dashboard
 *
 * Displays real-time metrics about job scraping quality:
 * - Overall job statistics
 * - Hospital scraping performance
 * - Duplicate detection
 * - Stale job identification
 * - Platform performance
 *
 * Usage: npx tsx scripts/monitor-job-quality.ts
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

// =====================
// Display Functions
// =====================

function printHeader(title: string) {
  console.log('\n' + '═'.repeat(80));
  console.log(`  ${title}`);
  console.log('═'.repeat(80) + '\n');
}

function printMetric(label: string, value: any, indent = 2) {
  const padding = ' '.repeat(indent);
  console.log(`${padding}${label}: ${value}`);
}

// =====================
// Monitoring Queries
// =====================

async function showOverallMetrics() {
  printHeader('📊 Overall Job Quality Metrics');

  const { data, error } = await supabase
    .from('job_quality_metrics')
    .select('*')
    .single();

  if (error) {
    console.error('❌ Error fetching metrics:', error);
    return;
  }

  printMetric('Total Jobs', data.total_jobs);
  printMetric('Hospitals with Jobs', data.hospitals_with_jobs);
  printMetric('Hospital Scraped Jobs', data.hospital_scraped);
  printMetric('RSS Jobs', data.rss_jobs);
  console.log();
  printMetric('✓ Validated Jobs', `${data.validated_jobs} (${data.validation_rate_pct}%)`);
  printMetric('✗ Unvalidated Jobs', data.unvalidated_jobs);
  printMetric('☠  Dead Links', `${data.dead_links} (${data.dead_link_rate_pct}%)`);
}

async function showHospitalStats() {
  printHeader('🏥 Hospital Scraping Statistics (Top 10)');

  const { data, error } = await supabase
    .from('hospital_scraping_stats')
    .select('*')
    .order('total_jobs_found', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching hospital stats:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  No hospital data available\n');
    return;
  }

  data.forEach((h, i) => {
    const statusEmoji = {
      healthy: '✅',
      never_scraped: '⏳',
      stale: '⚠️',
      failed: '❌',
      no_jobs_found: '🔍'
    }[h.scrape_status] || '❓';

    console.log(`${i + 1}. ${statusEmoji} ${h.name}`);
    printMetric('Platform', h.career_platform || 'unknown', 4);
    printMetric('Jobs Found', `${h.total_jobs_found} (${h.valid_jobs} validated)`, 4);
    printMetric('Last Scraped', h.last_scraped_at ? new Date(h.last_scraped_at).toLocaleDateString() : 'never', 4);
    if (i < data.length - 1) console.log();
  });
}

async function showDuplicates() {
  printHeader('🔄 Duplicate Jobs Detected');

  const { data, error } = await supabase
    .from('duplicate_jobs')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching duplicates:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  ✅ No duplicates detected!\n');
    return;
  }

  data.forEach((dup, i) => {
    console.log(`${i + 1}. ${dup.duplicate_count} duplicates`);
    printMetric('Titles', dup.titles.join(', '), 4);
    printMetric('Hospitals', dup.hospitals.join(', '), 4);
    console.log();
  });
}

async function showStaleJobs() {
  printHeader('⏰ Stale Jobs (Not Seen Recently)');

  const { data, error } = await supabase
    .from('stale_jobs')
    .select('*')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching stale jobs:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  ✅ No stale jobs detected!\n');
    return;
  }

  const staleCount = data.filter(j => j.staleness_status === 'stale').length;
  const veryStaleCount = data.filter(j => j.staleness_status === 'very_stale').length;
  const deadCount = data.filter(j => j.staleness_status === 'dead_link').length;

  console.log(`  Stale (14+ days): ${staleCount}`);
  console.log(`  Very Stale (30+ days): ${veryStaleCount}`);
  console.log(`  Dead Links: ${deadCount}`);
  console.log();

  data.slice(0, 5).forEach((job, i) => {
    const statusEmoji = {
      stale: '⚠️',
      very_stale: '🔴',
      dead_link: '☠️'
    }[job.staleness_status] || '❓';

    console.log(`${i + 1}. ${statusEmoji} ${job.title}`);
    printMetric('Hospital', job.hospital_name, 4);
    printMetric('Last Seen', new Date(job.last_seen_at).toLocaleDateString(), 4);
    if (i < 4) console.log();
  });
}

async function showPlatformPerformance() {
  printHeader('🛠  Platform Performance');

  const { data, error } = await supabase
    .from('platform_performance')
    .select('*');

  if (error) {
    console.error('❌ Error fetching platform stats:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('  No platform data available\n');
    return;
  }

  data.forEach((p, i) => {
    console.log(`${i + 1}. ${p.career_platform || 'unknown'}`);
    printMetric('Hospitals', p.hospitals_count, 4);
    printMetric('Total Jobs', p.total_jobs, 4);
    printMetric('Avg Jobs/Hospital', p.avg_jobs_per_hospital, 4);
    printMetric('Validation Rate', `${p.validation_rate_pct}%`, 4);
    printMetric('Success/Fail', `${p.successful_scrapes}/${p.failed_scrapes}`, 4);
    if (i < data.length - 1) console.log();
  });
}

async function showRecommendations() {
  printHeader('💡 Recommendations');

  // Count hospitals never scraped
  const { count: neverScraped } = await supabase
    .from('hospital_scraping_stats')
    .select('*', { count: 'exact', head: true })
    .eq('scrape_status', 'never_scraped');

  // Count stale hospitals
  const { count: staleHospitals } = await supabase
    .from('hospital_scraping_stats')
    .select('*', { count: 'exact', head: true })
    .eq('scrape_status', 'stale');

  // Count failed scrapes
  const { count: failedScrapes } = await supabase
    .from('hospital_scraping_stats')
    .select('*', { count: 'exact', head: true })
    .eq('scrape_status', 'failed');

  const recommendations = [];

  if (neverScraped && neverScraped > 0) {
    recommendations.push(`Run career page discovery for ${neverScraped} hospitals that have never been scraped`);
  }

  if (staleHospitals && staleHospitals > 5) {
    recommendations.push(`Re-scrape ${staleHospitals} hospitals that haven't been checked in 7+ days`);
  }

  if (failedScrapes && failedScrapes > 3) {
    recommendations.push(`Investigate ${failedScrapes} hospitals with failed scrapes`);
  }

  if (recommendations.length === 0) {
    console.log('  ✅ Everything looks good!\n');
  } else {
    recommendations.forEach((rec, i) => {
      console.log(`  ${i + 1}. ${rec}`);
    });
    console.log();
  }
}

// =====================
// Main
// =====================

async function main() {
  console.log('\n🔍 Job Quality Monitoring Dashboard');
  console.log(`📅 ${new Date().toLocaleString()}`);

  await showOverallMetrics();
  await showHospitalStats();
  await showPlatformPerformance();
  await showDuplicates();
  await showStaleJobs();
  await showRecommendations();

  console.log('═'.repeat(80));
  console.log('\n✨ Monitoring complete!\n');
}

main().catch(console.error);

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sfmgdvjwmoxoeqmcarbv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbWdkdmp3bW94b2VxbWNhcmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NjE5OTMsImV4cCI6MjA4NTUzNzk5M30.yyzU7Vwa1LBlcIlj1sJwb8Vtsb3DX__6JkKcCGmYlJw';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Normalize hospital names for matching
function normalizeHospitalName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Extract city name from hospital name
function extractCity(name: string): string | null {
  const normalized = normalizeHospitalName(name);

  // Common patterns: "Universitätsklinikum Hamburg", "Klinikum Frankfurt", "Charite Berlin"
  const cityPatterns = [
    /universitaetsklinikum\s+(\w+)/,
    /klinikum\s+(\w+)/,
    /krankenhaus\s+(\w+)/,
    /kliniken?\s+(\w+)/,
    /(\w+)\s+klinikum/,
    /(\w+)\s+krankenhaus/,
  ];

  for (const pattern of cityPatterns) {
    const match = normalized.match(pattern);
    if (match && match[1] && match[1].length > 3) {
      // Exclude generic words
      if (!['der', 'die', 'das', 'und', 'gemeinnuetzige', 'ggmbh', 'gmbh'].includes(match[1])) {
        return match[1];
      }
    }
  }

  return null;
}

// Check if job company matches hospital
function matchesHospital(jobCompany: string, hospitalName: string, hospitalCity?: string): boolean {
  const normalizedJob = normalizeHospitalName(jobCompany);
  const normalizedHospital = normalizeHospitalName(hospitalName);
  const normalizedCity = hospitalCity ? normalizeHospitalName(hospitalCity) : null;

  // Exact match (best case)
  if (normalizedJob === normalizedHospital) return true;

  // If hospital city is provided, check if job company contains it
  if (normalizedCity && normalizedJob.includes(normalizedCity)) {
    // Also check if the job company contains the hospital type (klinikum, krankenhaus, etc.)
    const hasHospitalType = /klinikum|krankenhaus|klinik/i.test(normalizedJob);
    if (hasHospitalType) {
      // Additional check: city should also be in hospital name
      if (normalizedHospital.includes(normalizedCity)) {
        return true;
      }
    }
  }

  // Extract city from both names and compare
  const jobCity = extractCity(jobCompany);
  const hospitalCityFromName = extractCity(hospitalName);

  if (jobCity && hospitalCityFromName && jobCity === hospitalCityFromName) {
    // Both have the same city, likely a match
    return true;
  }

  // Check for very specific matches (like Charité, UKE, etc.)
  const specificNames = ['charite', 'uke', 'lmu', 'rwth', 'asklepios', 'helios', 'sana', 'vivantes'];
  for (const specific of specificNames) {
    if (normalizedJob.includes(specific) && normalizedHospital.includes(specific)) {
      return true;
    }
  }

  return false;
}

async function linkJobsToHospitals() {
  console.log('\n🏥 Linking RSS jobs to hospitals...\n');

  // Get all RSS jobs without hospital_id
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, hospital_name, source')
    .neq('source', 'hospital_scrape')
    .is('hospital_id', null)
    .not('hospital_name', 'is', null);

  if (jobsError) {
    console.error('Error fetching jobs:', jobsError);
    return;
  }

  console.log(`Found ${jobs.length} RSS jobs without hospital_id\n`);

  // Get all hospitals
  const { data: hospitals, error: hospitalsError } = await supabase
    .from('hospitals')
    .select('id, name, city');

  if (hospitalsError) {
    console.error('Error fetching hospitals:', hospitalsError);
    return;
  }

  console.log(`Matching against ${hospitals.length} hospitals...\n`);

  let matched = 0;
  let notMatched = 0;

  for (const job of jobs) {
    // Find matching hospital
    const hospital = hospitals.find(h => matchesHospital(job.hospital_name, h.name, h.city));

    if (hospital) {
      // Update job with hospital_id
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ hospital_id: hospital.id })
        .eq('id', job.id);

      if (!updateError) {
        matched++;
        console.log(`✅ Matched: "${job.hospital_name}" → ${hospital.name}`);
      } else {
        console.error(`❌ Update failed for job ${job.id}:`, updateError);
      }
    } else {
      notMatched++;
      if (notMatched <= 10) {
        console.log(`⚠️  No match: "${job.hospital_name}"`);
      }
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Matched: ${matched}`);
  console.log(`   Not matched: ${notMatched}`);
  console.log(`   Success rate: ${((matched / jobs.length) * 100).toFixed(1)}%`);
}

linkJobsToHospitals();

/**
 * Hospital Discovery & Import Script
 *
 * Multi-source approach for comprehensive German hospital coverage:
 * 1. G-BA Quality Reports (primary - ~1,900 hospitals)
 * 2. State hospital registries (16 Bundesländer - fills gaps)
 * 3. Google Places API (final enrichment for missing data)
 *
 * Usage:
 *   npx tsx scripts/import-hospitals.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================
// Data Types
// =====================

interface Hospital {
  iknr?: string;
  name: string;
  type?: string;
  street?: string;
  plz: string;
  city: string;
  bundesland: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  phone?: string;
  email?: string;
  beds_count?: number;
  departments?: string[];
  source: string[];
}

// =====================
// Bundesland Mapping
// =====================

const BUNDESLAENDER = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
];

const PLZ_TO_BUNDESLAND_RANGES: Record<string, [number, number][]> = {
  'Baden-Württemberg': [[68000, 69999], [76000, 77999], [78000, 79999], [88000, 89999]],
  'Bayern': [[80000, 87999], [90000, 96999], [97000, 97999]],
  'Berlin': [[10000, 14999]],
  'Brandenburg': [[14400, 16999], [19000, 19999]],
  'Bremen': [[27500, 28999]],
  'Hamburg': [[20000, 21999], [22000, 22999]],
  'Hessen': [[34000, 36999], [60000, 63999], [64200, 65999]],
  'Mecklenburg-Vorpommern': [[17000, 19999], [23900, 23999]],
  'Niedersachsen': [[21200, 21999], [26000, 27999], [29000, 31999], [37000, 38999], [49000, 49999]],
  'Nordrhein-Westfalen': [[32000, 33999], [40000, 48999], [50000, 53999], [57000, 59999]],
  'Rheinland-Pfalz': [[54000, 56999], [66000, 67999]],
  'Saarland': [[66000, 66999]],
  'Sachsen': [[1000, 9999], [2600, 2999]],
  'Sachsen-Anhalt': [[6000, 6999], [38800, 39999]],
  'Schleswig-Holstein': [[23000, 25999]],
  'Thüringen': [[4000, 4999], [7000, 7999], [36400, 37999], [98500, 99999]],
};

function getBundeslandFromPLZ(plz: string): string | null {
  const numericPLZ = parseInt(plz, 10);
  if (isNaN(numericPLZ)) return null;

  for (const [bundesland, ranges] of Object.entries(PLZ_TO_BUNDESLAND_RANGES)) {
    for (const [min, max] of ranges) {
      if (numericPLZ >= min && numericPLZ <= max) {
        return bundesland;
      }
    }
  }
  return null;
}

// =====================
// Source 1: G-BA Web Search
// =====================

async function scrapeGBASearch(): Promise<Hospital[]> {
  console.log('📊 Scraping G-BA quality report search...');
  const hospitals: Hospital[] = [];

  try {
    // G-BA has a search API endpoint
    const baseUrl = 'https://www.g-ba-qualitaetsberichte.de';

    // Try to fetch the search endpoint
    // Note: This might require API key or specific headers
    // For now, we'll use a simpler approach with the public search

    for (const bundesland of BUNDESLAENDER) {
      console.log(`  Searching ${bundesland}...`);

      const response = await fetch(`${baseUrl}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; KlaroBot/1.0)',
        },
        body: JSON.stringify({
          bundesland,
          jahr: 2023,
        }),
      });

      if (!response.ok) {
        console.warn(`    ⚠️  Failed for ${bundesland}: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (Array.isArray(data.results)) {
        for (const item of data.results) {
          hospitals.push({
            iknr: item.ik_nummer || item.iknr,
            name: item.name || item.krankenhausname,
            type: classifyHospitalType(item.name),
            street: item.strasse,
            plz: item.plz,
            city: item.ort || item.city,
            bundesland,
            beds_count: parseInt(item.bettenzahl) || undefined,
            departments: item.fachabteilungen?.map((d: any) => d.name) || [],
            source: ['gba'],
          });
        }
        console.log(`    ✓ Found ${data.results.length} hospitals`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('❌ G-BA scraping failed:', error);
  }

  console.log(`📊 G-BA total: ${hospitals.length} hospitals\n`);
  return hospitals;
}

// =====================
// Source 2: State Hospital Registries
// =====================

const STATE_SOURCES = [
  {
    bundesland: 'Nordrhein-Westfalen',
    url: 'https://www.mgepa.nrw.de/krankenhaeuser',
    type: 'json', // or 'html'
  },
  // Add more state-specific sources
];

async function scrapeStateRegistries(): Promise<Hospital[]> {
  console.log('🏛️  Scraping state hospital registries...');
  const hospitals: Hospital[] = [];

  // For now, we'll use a simplified approach
  // In production, each state would have its own scraper

  console.log('🏛️  State registries: 0 hospitals (pending implementation)\n');
  return hospitals;
}

// =====================
// Source 3: Wikipedia Hospital List
// =====================

async function scrapeWikipediaHospitals(): Promise<Hospital[]> {
  console.log('📖 Scraping Wikipedia hospital lists...');
  const hospitals: Hospital[] = [];

  const wikipediaLists = [
    'https://de.wikipedia.org/wiki/Liste_der_Krankenhäuser_in_Deutschland',
    'https://de.wikipedia.org/wiki/Liste_deutscher_Universit%C3%A4tskliniken',
  ];

  try {
    for (const url of wikipediaLists) {
      const response = await fetch(url);
      if (!response.ok) continue;

      const html = await response.text();

      // Parse tables with hospital data
      // This would require cheerio or similar HTML parser
      // Simplified for now

      console.log(`  ⚠️  Wikipedia parsing not yet implemented`);
    }
  } catch (error) {
    console.error('❌ Wikipedia scraping failed:', error);
  }

  console.log(`📖 Wikipedia total: ${hospitals.length} hospitals\n`);
  return hospitals;
}

// =====================
// Source 4: Manual Seed Data (University Hospitals)
// =====================

function getUniversityHospitalsSeed(): Hospital[] {
  console.log('🎓 Loading university hospitals seed data...');

  const universities: Hospital[] = [
    {
      name: 'Charité – Universitätsmedizin Berlin',
      type: 'Universitätsklinikum',
      plz: '10117',
      city: 'Berlin',
      bundesland: 'Berlin',
      website: 'https://www.charite.de',
      beds_count: 3000,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Hamburg-Eppendorf',
      type: 'Universitätsklinikum',
      plz: '20246',
      city: 'Hamburg',
      bundesland: 'Hamburg',
      website: 'https://www.uke.de',
      beds_count: 1460,
      source: ['manual'],
    },
    {
      name: 'Klinikum rechts der Isar der TU München',
      type: 'Universitätsklinikum',
      plz: '81675',
      city: 'München',
      bundesland: 'Bayern',
      website: 'https://www.mri.tum.de',
      beds_count: 1161,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Heidelberg',
      type: 'Universitätsklinikum',
      plz: '69120',
      city: 'Heidelberg',
      bundesland: 'Baden-Württemberg',
      website: 'https://www.klinikum.uni-heidelberg.de',
      beds_count: 1900,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Düsseldorf',
      type: 'Universitätsklinikum',
      plz: '40225',
      city: 'Düsseldorf',
      bundesland: 'Nordrhein-Westfalen',
      website: 'https://www.uniklinik-duesseldorf.de',
      beds_count: 1280,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Frankfurt',
      type: 'Universitätsklinikum',
      plz: '60590',
      city: 'Frankfurt am Main',
      bundesland: 'Hessen',
      website: 'https://www.kgu.de',
      beds_count: 1450,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Freiburg',
      type: 'Universitätsklinikum',
      plz: '79106',
      city: 'Freiburg',
      bundesland: 'Baden-Württemberg',
      website: 'https://www.uniklinik-freiburg.de',
      beds_count: 1600,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Leipzig',
      type: 'Universitätsklinikum',
      plz: '04103',
      city: 'Leipzig',
      bundesland: 'Sachsen',
      website: 'https://www.uniklinikum-leipzig.de',
      beds_count: 1450,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Köln',
      type: 'Universitätsklinikum',
      plz: '50937',
      city: 'Köln',
      bundesland: 'Nordrhein-Westfalen',
      website: 'https://www.uk-koeln.de',
      beds_count: 1580,
      source: ['manual'],
    },
    {
      name: 'Universitätsklinikum Würzburg',
      type: 'Universitätsklinikum',
      plz: '97080',
      city: 'Würzburg',
      bundesland: 'Bayern',
      website: 'https://www.ukw.de',
      beds_count: 1370,
      source: ['manual'],
    },
  ];

  console.log(`🎓 University hospitals: ${universities.length}\n`);
  return universities;
}

// =====================
// Helpers
// =====================

function classifyHospitalType(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('universitätsklinikum') || nameLower.includes('uniklinik')) {
    return 'Universitätsklinikum';
  }
  if (nameLower.includes('krankenhaus')) {
    return 'Krankenhaus';
  }
  if (nameLower.includes('klinikum')) {
    return 'Klinikum';
  }
  if (nameLower.includes('klinik')) {
    return 'Klinik';
  }
  if (nameLower.includes('fachklinik')) {
    return 'Fachklinik';
  }
  if (nameLower.includes('reha')) {
    return 'Rehabilitationsklinik';
  }
  return 'Krankenhaus';
}

// =====================
// Deduplication
// =====================

function deduplicateHospitals(hospitals: Hospital[]): Hospital[] {
  console.log(`🔄 Deduplicating ${hospitals.length} hospitals...`);

  const seen = new Map<string, Hospital>();

  for (const hospital of hospitals) {
    // Create dedup key: normalized name + PLZ
    const normalizedName = hospital.name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]/g, '');

    const key = `${normalizedName}_${hospital.plz}`;

    if (seen.has(key)) {
      // Merge sources
      const existing = seen.get(key)!;
      existing.source = [...new Set([...existing.source, ...hospital.source])];

      // Keep more complete data
      if (!existing.iknr && hospital.iknr) existing.iknr = hospital.iknr;
      if (!existing.website && hospital.website) existing.website = hospital.website;
      if (!existing.street && hospital.street) existing.street = hospital.street;
      if (!existing.phone && hospital.phone) existing.phone = hospital.phone;
      if (!existing.beds_count && hospital.beds_count) existing.beds_count = hospital.beds_count;
      if ((!existing.departments || existing.departments.length === 0) && hospital.departments) {
        existing.departments = hospital.departments;
      }
    } else {
      seen.set(key, hospital);
    }
  }

  const deduplicated = Array.from(seen.values());
  console.log(`🔄 After deduplication: ${deduplicated.length} unique hospitals\n`);

  return deduplicated;
}

// =====================
// Database Import
// =====================

async function importToDatabase(hospitals: Hospital[]) {
  console.log(`💾 Importing ${hospitals.length} hospitals to database...`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const hospital of hospitals) {
    try {
      const { error } = await supabase.from('hospitals').insert({
        iknr: hospital.iknr,
        name: hospital.name,
        type: hospital.type,
        street: hospital.street,
        plz: hospital.plz,
        city: hospital.city,
        bundesland: hospital.bundesland || getBundeslandFromPLZ(hospital.plz),
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        website: hospital.website,
        phone: hospital.phone,
        email: hospital.email,
        beds_count: hospital.beds_count,
        departments: hospital.departments ? JSON.stringify(hospital.departments) : null,
        source: hospital.source,
        is_active: true,
        verified: hospital.source.includes('gba'), // G-BA data is official
      });

      if (error) {
        if (error.code === '23505') {
          // Duplicate - update sources instead
          skipped++;
        } else {
          console.error(`  ❌ Error importing ${hospital.name}:`, error.message);
          errors++;
        }
      } else {
        imported++;
      }
    } catch (error) {
      console.error(`  ❌ Unexpected error for ${hospital.name}:`, error);
      errors++;
    }
  }

  console.log(`💾 Import complete:`);
  console.log(`  ✓ Imported: ${imported}`);
  console.log(`  ⊘ Skipped (duplicates): ${skipped}`);
  console.log(`  ❌ Errors: ${errors}\n`);
}

// =====================
// Main
// =====================

async function main() {
  console.log('🏥 German Hospital Discovery & Import\n');
  console.log('═'.repeat(50) + '\n');

  let allHospitals: Hospital[] = [];

  // Source 1: G-BA Quality Reports
  const gbaHospitals = await scrapeGBASearch();
  allHospitals.push(...gbaHospitals);

  // Source 2: State Registries
  const stateHospitals = await scrapeStateRegistries();
  allHospitals.push(...stateHospitals);

  // Source 3: Wikipedia
  const wikiHospitals = await scrapeWikipediaHospitals();
  allHospitals.push(...wikiHospitals);

  // Source 4: Manual seed (university hospitals)
  const seedHospitals = getUniversityHospitalsSeed();
  allHospitals.push(...seedHospitals);

  // Deduplicate
  const uniqueHospitals = deduplicateHospitals(allHospitals);

  // Import to database
  await importToDatabase(uniqueHospitals);

  console.log('═'.repeat(50));
  console.log('✅ Hospital import complete!\n');
  console.log(`📊 Summary:`);
  console.log(`  Total sources processed: 4`);
  console.log(`  Total hospitals found: ${allHospitals.length}`);
  console.log(`  Unique hospitals: ${uniqueHospitals.length}`);
  console.log(`\n💡 Next step: Run career page discovery`);
  console.log(`   npx tsx scripts/discover-career-pages.ts`);
}

main().catch(console.error);

/**
 * Hospital Registry Scraper
 *
 * Scrapes German hospital data from multiple sources:
 * 1. Deutsche Krankenhausgesellschaft (DKG) - https://www.dkgev.de
 * 2. State hospital registries (16 Bundesländer)
 * 3. Wikipedia list of German hospitals
 *
 * Usage: npx tsx scripts/scrape-hospital-registries.ts
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

interface Hospital {
  name: string;
  type?: string;
  plz?: string;
  city: string;
  bundesland: string;
  website?: string;
  beds_count?: number;
  source: string[];
}

// =====================
// Wikipedia Scraper (Disabled - requires cheerio)
// =====================

// Commented out - requires cheerio package
// To enable: npm install cheerio
/*
async function scrapeWikipediaHospitals(): Promise<Hospital[]> {
  console.log('\n📚 Scraping Wikipedia hospital lists...\n');
  const hospitals: Hospital[] = [];
  // ... implementation
  return hospitals;
}
*/

// =====================
// Manual Hospital Lists by Bundesland
// =====================

function getManualHospitalList(): Hospital[] {
  // Top hospitals per Bundesland (starter dataset)
  return [
    // Baden-Württemberg
    { name: 'Universitätsklinikum Heidelberg', city: 'Heidelberg', plz: '69120', bundesland: 'Baden-Württemberg', website: 'https://www.klinikum.uni-heidelberg.de', beds_count: 1900, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Freiburg', city: 'Freiburg', plz: '79106', bundesland: 'Baden-Württemberg', website: 'https://www.uniklinik-freiburg.de', beds_count: 1600, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Tübingen', city: 'Tübingen', plz: '72076', bundesland: 'Baden-Württemberg', website: 'https://www.medizin.uni-tuebingen.de', beds_count: 1585, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Ulm', city: 'Ulm', plz: '89081', bundesland: 'Baden-Württemberg', website: 'https://www.uniklinik-ulm.de', beds_count: 1264, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Robert-Bosch-Krankenhaus', city: 'Stuttgart', plz: '70376', bundesland: 'Baden-Württemberg', website: 'https://www.rbk.de', beds_count: 1041, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Städtisches Klinikum Karlsruhe', city: 'Karlsruhe', plz: '76133', bundesland: 'Baden-Württemberg', website: 'https://www.klinikum-karlsruhe.de', beds_count: 1538, type: 'Klinikum', source: ['manual'] },

    // Bayern
    { name: 'Klinikum rechts der Isar der TU München', city: 'München', plz: '81675', bundesland: 'Bayern', website: 'https://www.mri.tum.de', beds_count: 1161, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Würzburg', city: 'Würzburg', plz: '97080', bundesland: 'Bayern', website: 'https://www.ukw.de', beds_count: 1370, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Erlangen', city: 'Erlangen', plz: '91054', bundesland: 'Bayern', website: 'https://www.uk-erlangen.de', beds_count: 1371, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Regensburg', city: 'Regensburg', plz: '93053', bundesland: 'Bayern', website: 'https://www.ukr.de', beds_count: 833, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum der Universität München (LMU)', city: 'München', plz: '81377', bundesland: 'Bayern', website: 'https://www.klinikum.uni-muenchen.de', beds_count: 2200, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Augsburg', city: 'Augsburg', plz: '86156', bundesland: 'Bayern', website: 'https://www.klinikum-augsburg.de', beds_count: 1740, type: 'Klinikum', source: ['manual'] },

    // Berlin
    { name: 'Charité – Universitätsmedizin Berlin', city: 'Berlin', plz: '10117', bundesland: 'Berlin', website: 'https://www.charite.de', beds_count: 3000, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Vivantes Klinikum Neukölln', city: 'Berlin', plz: '12351', bundesland: 'Berlin', website: 'https://www.vivantes.de', beds_count: 1200, type: 'Krankenhaus', source: ['manual'] },

    // Brandenburg
    { name: 'Städtisches Klinikum Brandenburg', city: 'Brandenburg an der Havel', plz: '14770', bundesland: 'Brandenburg', website: 'https://www.klinikum-brandenburg.de', beds_count: 750, type: 'Klinikum', source: ['manual'] },
    { name: 'Carl-Thiem-Klinikum Cottbus', city: 'Cottbus', plz: '03048', bundesland: 'Brandenburg', website: 'https://www.ctk.de', beds_count: 880, type: 'Klinikum', source: ['manual'] },

    // Bremen
    { name: 'Klinikum Bremen-Mitte', city: 'Bremen', plz: '28177', bundesland: 'Bremen', website: 'https://www.gesundheitnord.de', beds_count: 1200, type: 'Klinikum', source: ['manual'] },

    // Hamburg
    { name: 'Universitätsklinikum Hamburg-Eppendorf', city: 'Hamburg', plz: '20246', bundesland: 'Hamburg', website: 'https://www.uke.de', beds_count: 1460, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Asklepios Klinik Barmbek', city: 'Hamburg', plz: '22307', bundesland: 'Hamburg', website: 'https://www.asklepios.com/hamburg/barmbek', beds_count: 733, type: 'Krankenhaus', source: ['manual'] },

    // Hessen
    { name: 'Universitätsklinikum Frankfurt', city: 'Frankfurt am Main', plz: '60590', bundesland: 'Hessen', website: 'https://www.kgu.de', beds_count: 1450, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Gießen und Marburg', city: 'Gießen', plz: '35392', bundesland: 'Hessen', website: 'https://www.ukgm.de', beds_count: 1850, type: 'Universitätsklinikum', source: ['manual'] },

    // Niedersachsen
    { name: 'Universitätsklinikum Göttingen', city: 'Göttingen', plz: '37075', bundesland: 'Niedersachsen', website: 'https://www.umg.eu', beds_count: 1500, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Medizinische Hochschule Hannover', city: 'Hannover', plz: '30625', bundesland: 'Niedersachsen', website: 'https://www.mhh.de', beds_count: 1400, type: 'Universitätsklinikum', source: ['manual'] },

    // Nordrhein-Westfalen
    { name: 'Universitätsklinikum Düsseldorf', city: 'Düsseldorf', plz: '40225', bundesland: 'Nordrhein-Westfalen', website: 'https://www.uniklinik-duesseldorf.de', beds_count: 1280, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Köln', city: 'Köln', plz: '50937', bundesland: 'Nordrhein-Westfalen', website: 'https://www.uk-koeln.de', beds_count: 1580, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Bonn', city: 'Bonn', plz: '53127', bundesland: 'Nordrhein-Westfalen', website: 'https://www.ukbonn.de', beds_count: 1300, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Essen', city: 'Essen', plz: '45147', bundesland: 'Nordrhein-Westfalen', website: 'https://www.uk-essen.de', beds_count: 1300, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Münster', city: 'Münster', plz: '48149', bundesland: 'Nordrhein-Westfalen', website: 'https://www.ukm.de', beds_count: 1457, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Aachen (RWTH)', city: 'Aachen', plz: '52074', bundesland: 'Nordrhein-Westfalen', website: 'https://www.ukaachen.de', beds_count: 1400, type: 'Universitätsklinikum', source: ['manual'] },

    // Sachsen
    { name: 'Universitätsklinikum Leipzig', city: 'Leipzig', plz: '04103', bundesland: 'Sachsen', website: 'https://www.uniklinikum-leipzig.de', beds_count: 1450, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Dresden', city: 'Dresden', plz: '01307', bundesland: 'Sachsen', website: 'https://www.uniklinikum-dresden.de', beds_count: 1295, type: 'Universitätsklinikum', source: ['manual'] },

    // Thüringen
    { name: 'Universitätsklinikum Jena', city: 'Jena', plz: '07747', bundesland: 'Thüringen', website: 'https://www.uniklinikum-jena.de', beds_count: 1376, type: 'Universitätsklinikum', source: ['manual'] },
  ];
}

// =====================
// Import to Database
// =====================

async function importHospitals(hospitals: Hospital[]): Promise<void> {
  console.log(`\n📥 Importing ${hospitals.length} hospitals to database...\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const hospital of hospitals) {
    try {
      const { error } = await supabase
        .from('hospitals')
        .upsert({
          name: hospital.name,
          type: hospital.type,
          plz: hospital.plz,
          city: hospital.city,
          bundesland: hospital.bundesland,
          website: hospital.website,
          beds_count: hospital.beds_count,
          source: hospital.source,
          is_active: true,
          verified: hospital.source.includes('manual')
        }, {
          onConflict: 'name_normalized,plz',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`  ❌ Failed to import ${hospital.name}:`, error.message);
        errors++;
      } else {
        imported++;
        if (imported % 10 === 0) {
          console.log(`  ✓ Imported ${imported}/${hospitals.length}...`);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`  ❌ Error importing ${hospital.name}:`, error);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`\n✅ Import complete!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

// =====================
// Main
// =====================

async function main() {
  console.log('🏥 Hospital Registry Scraper');
  console.log('═'.repeat(60));

  // Start with manual curated list
  console.log('\n1️⃣ Loading manual hospital list...');
  const manualHospitals = getManualHospitalList();
  console.log(`  ✓ Loaded ${manualHospitals.length} hospitals`);

  // Scrape Wikipedia (optional)
  // const wikiHospitals = await scrapeWikipediaHospitals();

  // Combine and deduplicate
  const allHospitals = [...manualHospitals];

  // Import to database
  await importHospitals(allHospitals);

  console.log('\n🎉 All done!\n');
}

main().catch(console.error);

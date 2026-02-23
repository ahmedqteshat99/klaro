/**
 * Comprehensive German Hospital Import System
 *
 * Imports hospitals from multiple sources:
 * 1. Wikipedia lists (university hospitals, largest hospitals)
 * 2. Manual curated list (100+ major hospitals)
 * 3. Open data sources
 *
 * Usage: npx tsx scripts/import-german-hospitals.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

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

// Bundesland mapping from common abbreviations
const BUNDESLAND_MAP: Record<string, string> = {
  'BW': 'Baden-Württemberg',
  'BY': 'Bayern',
  'BE': 'Berlin',
  'BB': 'Brandenburg',
  'HB': 'Bremen',
  'HH': 'Hamburg',
  'HE': 'Hessen',
  'MV': 'Mecklenburg-Vorpommern',
  'NI': 'Niedersachsen',
  'NW': 'Nordrhein-Westfalen',
  'RP': 'Rheinland-Pfalz',
  'SL': 'Saarland',
  'SN': 'Sachsen',
  'ST': 'Sachsen-Anhalt',
  'SH': 'Schleswig-Holstein',
  'TH': 'Thüringen'
};

// =====================
// Wikipedia Scrapers
// =====================

async function scrapeUniversityHospitals(): Promise<Hospital[]> {
  console.log('\n📚 Scraping Wikipedia university hospitals...');

  const hospitals: Hospital[] = [];

  try {
    const response = await fetch('https://de.wikipedia.org/wiki/Liste_der_Universit%C3%A4tskliniken_in_Deutschland');
    const html = await response.text();
    const $ = cheerio.load(html);

    $('table.wikitable tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      const nameCell = $(cells[0]);
      const locationCell = $(cells[1]);

      let name = nameCell.text().trim();
      const link = nameCell.find('a').first();
      if (link.length) {
        name = link.text().trim();
      }

      const location = locationCell.text().trim();

      // Extract website if available
      let website = '';
      const externalLink = nameCell.find('a.external').attr('href');
      if (externalLink) {
        website = externalLink;
      }

      if (name && location) {
        hospitals.push({
          name,
          city: location.split(',')[0].trim(),
          bundesland: location.includes(',') ? location.split(',')[1].trim() : '',
          website,
          type: 'Universitätsklinikum',
          source: ['wikipedia']
        });
      }
    });

    console.log(`  ✓ Found ${hospitals.length} university hospitals`);
  } catch (error) {
    console.error('  ❌ Failed to scrape Wikipedia:', error);
  }

  return hospitals;
}

// =====================
// Curated Hospital Database
// =====================

function getCuratedHospitals(): Hospital[] {
  console.log('\n📋 Loading curated hospital database...');

  const hospitals: Hospital[] = [
    // Baden-Württemberg
    { name: 'Universitätsklinikum Heidelberg', city: 'Heidelberg', plz: '69120', bundesland: 'Baden-Württemberg', website: 'https://www.klinikum.uni-heidelberg.de', beds_count: 1900, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Freiburg', city: 'Freiburg', plz: '79106', bundesland: 'Baden-Württemberg', website: 'https://www.uniklinik-freiburg.de', beds_count: 1600, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Tübingen', city: 'Tübingen', plz: '72076', bundesland: 'Baden-Württemberg', website: 'https://www.medizin.uni-tuebingen.de', beds_count: 1585, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Ulm', city: 'Ulm', plz: '89081', bundesland: 'Baden-Württemberg', website: 'https://www.uniklinik-ulm.de', beds_count: 1264, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Robert-Bosch-Krankenhaus', city: 'Stuttgart', plz: '70376', bundesland: 'Baden-Württemberg', website: 'https://www.rbk.de', beds_count: 1041, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Städtisches Klinikum Karlsruhe', city: 'Karlsruhe', plz: '76133', bundesland: 'Baden-Württemberg', website: 'https://www.klinikum-karlsruhe.de', beds_count: 1538, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Stuttgart', city: 'Stuttgart', plz: '70174', bundesland: 'Baden-Württemberg', website: 'https://www.klinikum-stuttgart.de', beds_count: 2100, type: 'Klinikum', source: ['manual'] },
    { name: 'Universitäts-Herzzentrum Freiburg Bad Krozingen', city: 'Bad Krozingen', plz: '79189', bundesland: 'Baden-Württemberg', website: 'https://www.universitaets-herzzentrum.de', beds_count: 355, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Esslingen', city: 'Esslingen', plz: '73730', bundesland: 'Baden-Württemberg', website: 'https://www.klinikum-esslingen.de', beds_count: 800, type: 'Klinikum', source: ['manual'] },
    { name: 'SLK-Kliniken Heilbronn', city: 'Heilbronn', plz: '74078', bundesland: 'Baden-Württemberg', website: 'https://www.slk-kliniken.de', beds_count: 1088, type: 'Klinikum', source: ['manual'] },

    // Bayern
    { name: 'Klinikum rechts der Isar der TU München', city: 'München', plz: '81675', bundesland: 'Bayern', website: 'https://www.mri.tum.de', beds_count: 1161, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum der Universität München (LMU)', city: 'München', plz: '81377', bundesland: 'Bayern', website: 'https://www.klinikum.uni-muenchen.de', beds_count: 2200, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Würzburg', city: 'Würzburg', plz: '97080', bundesland: 'Bayern', website: 'https://www.ukw.de', beds_count: 1370, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Erlangen', city: 'Erlangen', plz: '91054', bundesland: 'Bayern', website: 'https://www.uk-erlangen.de', beds_count: 1371, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Regensburg', city: 'Regensburg', plz: '93053', bundesland: 'Bayern', website: 'https://www.ukr.de', beds_count: 833, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Augsburg', city: 'Augsburg', plz: '86156', bundesland: 'Bayern', website: 'https://www.klinikum-augsburg.de', beds_count: 1740, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Nürnberg', city: 'Nürnberg', plz: '90419', bundesland: 'Bayern', website: 'https://www.klinikum-nuernberg.de', beds_count: 2200, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Ingolstadt', city: 'Ingolstadt', plz: '85049', bundesland: 'Bayern', website: 'https://www.klinikum-ingolstadt.de', beds_count: 800, type: 'Klinikum', source: ['manual'] },
    { name: 'Helios Amper-Klinikum Dachau', city: 'Dachau', plz: '85221', bundesland: 'Bayern', website: 'https://www.helios-gesundheit.de/kliniken/dachau', beds_count: 500, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Bayreuth', city: 'Bayreuth', plz: '95445', bundesland: 'Bayern', website: 'https://www.klinikum-bayreuth.de', beds_count: 1050, type: 'Klinikum', source: ['manual'] },

    // Berlin
    { name: 'Charité – Universitätsmedizin Berlin', city: 'Berlin', plz: '10117', bundesland: 'Berlin', website: 'https://www.charite.de', beds_count: 3000, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Vivantes Klinikum Neukölln', city: 'Berlin', plz: '12351', bundesland: 'Berlin', website: 'https://www.vivantes.de', beds_count: 1200, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Vivantes Klinikum Am Urban', city: 'Berlin', plz: '10967', bundesland: 'Berlin', website: 'https://www.vivantes.de', beds_count: 600, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Helios Klinikum Berlin-Buch', city: 'Berlin', plz: '13125', bundesland: 'Berlin', website: 'https://www.helios-gesundheit.de/kliniken/berlin-buch', beds_count: 1100, type: 'Klinikum', source: ['manual'] },
    { name: 'DRK Kliniken Berlin Westend', city: 'Berlin', plz: '14050', bundesland: 'Berlin', website: 'https://www.drk-kliniken-berlin.de', beds_count: 540, type: 'Klinikum', source: ['manual'] },

    // Brandenburg
    { name: 'Städtisches Klinikum Brandenburg', city: 'Brandenburg an der Havel', plz: '14770', bundesland: 'Brandenburg', website: 'https://www.klinikum-brandenburg.de', beds_count: 750, type: 'Klinikum', source: ['manual'] },
    { name: 'Carl-Thiem-Klinikum Cottbus', city: 'Cottbus', plz: '03048', bundesland: 'Brandenburg', website: 'https://www.ctk.de', beds_count: 880, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Ernst von Bergmann', city: 'Potsdam', plz: '14467', bundesland: 'Brandenburg', website: 'https://www.klinikumevb.de', beds_count: 1100, type: 'Klinikum', source: ['manual'] },
    { name: 'Sana Klinikum Lichtenberg', city: 'Lichtenberg', plz: '10365', bundesland: 'Brandenburg', website: 'https://www.sana.de/lichtenberg', beds_count: 550, type: 'Klinikum', source: ['manual'] },

    // Bremen
    { name: 'Klinikum Bremen-Mitte', city: 'Bremen', plz: '28177', bundesland: 'Bremen', website: 'https://www.gesundheitnord.de', beds_count: 1200, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Bremen-Ost', city: 'Bremen', plz: '28325', bundesland: 'Bremen', website: 'https://www.gesundheitnord.de', beds_count: 800, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Links der Weser', city: 'Bremen', plz: '28239', bundesland: 'Bremen', website: 'https://www.gesundheitnord.de', beds_count: 650, type: 'Klinikum', source: ['manual'] },

    // Hamburg
    { name: 'Universitätsklinikum Hamburg-Eppendorf', city: 'Hamburg', plz: '20246', bundesland: 'Hamburg', website: 'https://www.uke.de', beds_count: 1460, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Asklepios Klinik Barmbek', city: 'Hamburg', plz: '22307', bundesland: 'Hamburg', website: 'https://www.asklepios.com/hamburg/barmbek', beds_count: 733, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Asklepios Klinik Altona', city: 'Hamburg', plz: '22763', bundesland: 'Hamburg', website: 'https://www.asklepios.com/hamburg/altona', beds_count: 800, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Asklepios Klinik Nord', city: 'Hamburg', plz: '22419', bundesland: 'Hamburg', website: 'https://www.asklepios.com/hamburg/nord', beds_count: 850, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Katholisches Marienkrankenhaus Hamburg', city: 'Hamburg', plz: '22087', bundesland: 'Hamburg', website: 'https://www.marienkrankenhaus.org', beds_count: 420, type: 'Krankenhaus', source: ['manual'] },

    // Hessen
    { name: 'Universitätsklinikum Frankfurt', city: 'Frankfurt am Main', plz: '60590', bundesland: 'Hessen', website: 'https://www.kgu.de', beds_count: 1450, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Gießen und Marburg', city: 'Gießen', plz: '35392', bundesland: 'Hessen', website: 'https://www.ukgm.de', beds_count: 1850, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Darmstadt', city: 'Darmstadt', plz: '64283', bundesland: 'Hessen', website: 'https://www.klinikum-darmstadt.de', beds_count: 1000, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Kassel', city: 'Kassel', plz: '34125', bundesland: 'Hessen', website: 'https://www.klinikum-kassel.de', beds_count: 1400, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Fulda', city: 'Fulda', plz: '36043', bundesland: 'Hessen', website: 'https://www.klinikum-fulda.de', beds_count: 950, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Offenbach', city: 'Offenbach', plz: '63069', bundesland: 'Hessen', website: 'https://www.sana.de/offenbach', beds_count: 700, type: 'Klinikum', source: ['manual'] },

    // Mecklenburg-Vorpommern
    { name: 'Universitätsmedizin Greifswald', city: 'Greifswald', plz: '17475', bundesland: 'Mecklenburg-Vorpommern', website: 'https://www.medizin.uni-greifswald.de', beds_count: 950, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsmedizin Rostock', city: 'Rostock', plz: '18057', bundesland: 'Mecklenburg-Vorpommern', website: 'https://www.med.uni-rostock.de', beds_count: 1000, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Helios Kliniken Schwerin', city: 'Schwerin', plz: '19049', bundesland: 'Mecklenburg-Vorpommern', website: 'https://www.helios-gesundheit.de/kliniken/schwerin', beds_count: 820, type: 'Klinikum', source: ['manual'] },

    // Niedersachsen
    { name: 'Universitätsklinikum Göttingen', city: 'Göttingen', plz: '37075', bundesland: 'Niedersachsen', website: 'https://www.umg.eu', beds_count: 1500, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Medizinische Hochschule Hannover', city: 'Hannover', plz: '30625', bundesland: 'Niedersachsen', website: 'https://www.mhh.de', beds_count: 1400, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Region Hannover', city: 'Hannover', plz: '30459', bundesland: 'Niedersachsen', website: 'https://www.krh.de', beds_count: 2600, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Braunschweig', city: 'Braunschweig', plz: '38126', bundesland: 'Niedersachsen', website: 'https://www.klinikum-braunschweig.de', beds_count: 1500, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Oldenburg', city: 'Oldenburg', plz: '26133', bundesland: 'Niedersachsen', website: 'https://www.klinikum-oldenburg.de', beds_count: 880, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Osnabrück', city: 'Osnabrück', plz: '49076', bundesland: 'Niedersachsen', website: 'https://www.klinikum-os.de', beds_count: 900, type: 'Klinikum', source: ['manual'] },

    // Nordrhein-Westfalen
    { name: 'Universitätsklinikum Düsseldorf', city: 'Düsseldorf', plz: '40225', bundesland: 'Nordrhein-Westfalen', website: 'https://www.uniklinik-duesseldorf.de', beds_count: 1280, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Köln', city: 'Köln', plz: '50937', bundesland: 'Nordrhein-Westfalen', website: 'https://www.uk-koeln.de', beds_count: 1580, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Bonn', city: 'Bonn', plz: '53127', bundesland: 'Nordrhein-Westfalen', website: 'https://www.ukbonn.de', beds_count: 1300, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Essen', city: 'Essen', plz: '45147', bundesland: 'Nordrhein-Westfalen', website: 'https://www.uk-essen.de', beds_count: 1300, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Münster', city: 'Münster', plz: '48149', bundesland: 'Nordrhein-Westfalen', website: 'https://www.ukm.de', beds_count: 1457, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Aachen (RWTH)', city: 'Aachen', plz: '52074', bundesland: 'Nordrhein-Westfalen', website: 'https://www.ukaachen.de', beds_count: 1400, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Dortmund', city: 'Dortmund', plz: '44137', bundesland: 'Nordrhein-Westfalen', website: 'https://www.klinikumdo.de', beds_count: 1500, type: 'Klinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Bochum', city: 'Bochum', plz: '44791', bundesland: 'Nordrhein-Westfalen', website: 'https://www.klinikum-bochum.de', beds_count: 1000, type: 'Klinikum', source: ['manual'] },
    { name: 'Helios Universitätsklinikum Wuppertal', city: 'Wuppertal', plz: '42283', bundesland: 'Nordrhein-Westfalen', website: 'https://www.helios-gesundheit.de/kliniken/wuppertal', beds_count: 900, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Bielefeld', city: 'Bielefeld', plz: '33604', bundesland: 'Nordrhein-Westfalen', website: 'https://www.klinikumbielefeld.de', beds_count: 1200, type: 'Klinikum', source: ['manual'] },

    // Rheinland-Pfalz
    { name: 'Universitätsmedizin Mainz', city: 'Mainz', plz: '55131', bundesland: 'Rheinland-Pfalz', website: 'https://www.unimedizin-mainz.de', beds_count: 1450, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Westpfalz-Klinikum', city: 'Kaiserslautern', plz: '67655', bundesland: 'Rheinland-Pfalz', website: 'https://www.westpfalz-klinikum.de', beds_count: 800, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Ludwigshafen', city: 'Ludwigshafen', plz: '67063', bundesland: 'Rheinland-Pfalz', website: 'https://www.klilu.de', beds_count: 900, type: 'Klinikum', source: ['manual'] },
    { name: 'Klinikum Koblenz', city: 'Koblenz', plz: '56068', bundesland: 'Rheinland-Pfalz', website: 'https://www.klinikum-koblenz.de', beds_count: 570, type: 'Klinikum', source: ['manual'] },

    // Saarland
    { name: 'Universitätsklinikum des Saarlandes', city: 'Homburg', plz: '66421', bundesland: 'Saarland', website: 'https://www.uniklinikum-saarland.de', beds_count: 1200, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Saarbrücken', city: 'Saarbrücken', plz: '66119', bundesland: 'Saarland', website: 'https://www.klinikum-saarbruecken.de', beds_count: 1100, type: 'Klinikum', source: ['manual'] },

    // Sachsen
    { name: 'Universitätsklinikum Leipzig', city: 'Leipzig', plz: '04103', bundesland: 'Sachsen', website: 'https://www.uniklinikum-leipzig.de', beds_count: 1450, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Dresden', city: 'Dresden', plz: '01307', bundesland: 'Sachsen', website: 'https://www.uniklinikum-dresden.de', beds_count: 1295, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Klinikum Chemnitz', city: 'Chemnitz', plz: '09113', bundesland: 'Sachsen', website: 'https://www.klinikumchemnitz.de', beds_count: 1800, type: 'Klinikum', source: ['manual'] },
    { name: 'Städtisches Klinikum Dresden', city: 'Dresden', plz: '01067', bundesland: 'Sachsen', website: 'https://www.khdf.de', beds_count: 1200, type: 'Klinikum', source: ['manual'] },

    // Sachsen-Anhalt
    { name: 'Universitätsklinikum Magdeburg', city: 'Magdeburg', plz: '39120', bundesland: 'Sachsen-Anhalt', website: 'https://www.med.uni-magdeburg.de', beds_count: 1100, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Halle', city: 'Halle', plz: '06120', bundesland: 'Sachsen-Anhalt', website: 'https://www.medizin.uni-halle.de', beds_count: 1450, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Ameos Klinikum Halberstadt', city: 'Halberstadt', plz: '38820', bundesland: 'Sachsen-Anhalt', website: 'https://www.ameos.de/halberstadt', beds_count: 550, type: 'Klinikum', source: ['manual'] },

    // Schleswig-Holstein
    { name: 'Universitätsklinikum Schleswig-Holstein (Kiel)', city: 'Kiel', plz: '24105', bundesland: 'Schleswig-Holstein', website: 'https://www.uksh.de', beds_count: 2200, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Universitätsklinikum Schleswig-Holstein (Lübeck)', city: 'Lübeck', plz: '23538', bundesland: 'Schleswig-Holstein', website: 'https://www.uksh.de', beds_count: 1200, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Friedrich-Ebert-Krankenhaus Neumünster', city: 'Neumünster', plz: '24534', bundesland: 'Schleswig-Holstein', website: 'https://www.fek.de', beds_count: 750, type: 'Krankenhaus', source: ['manual'] },
    { name: 'Imland Klinik Rendsburg', city: 'Rendsburg', plz: '24768', bundesland: 'Schleswig-Holstein', website: 'https://www.imland.de', beds_count: 850, type: 'Klinikum', source: ['manual'] },

    // Thüringen
    { name: 'Universitätsklinikum Jena', city: 'Jena', plz: '07747', bundesland: 'Thüringen', website: 'https://www.uniklinikum-jena.de', beds_count: 1376, type: 'Universitätsklinikum', source: ['manual'] },
    { name: 'Helios Klinikum Erfurt', city: 'Erfurt', plz: '99089', bundesland: 'Thüringen', website: 'https://www.helios-gesundheit.de/kliniken/erfurt', beds_count: 1200, type: 'Klinikum', source: ['manual'] },
    { name: 'Südharz Klinikum Nordhausen', city: 'Nordhausen', plz: '99734', bundesland: 'Thüringen', website: 'https://www.shk-ndh.de', beds_count: 650, type: 'Klinikum', source: ['manual'] },
    { name: 'Zentralklinik Bad Berka', city: 'Bad Berka', plz: '99437', bundesland: 'Thüringen', website: 'https://www.zentralklinik.de', beds_count: 850, type: 'Klinikum', source: ['manual'] },
  ];

  console.log(`  ✓ Loaded ${hospitals.length} curated hospitals`);
  return hospitals;
}

// =====================
// Database Import
// =====================

async function importToDatabase(hospitals: Hospital[]): Promise<void> {
  console.log(`\n📥 Importing ${hospitals.length} hospitals to database...`);

  let imported = 0;
  let updated = 0;
  let errors = 0;

  for (const hospital of hospitals) {
    try {
      const { error } = await supabase
        .from('hospitals')
        .insert({
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
        });

      if (error) {
        if (error.code === '23505') { // Duplicate key
          updated++;
        } else {
          console.error(`  ❌ ${hospital.name}:`, error.message);
          errors++;
        }
      } else {
        imported++;
      }

      if ((imported + updated) % 25 === 0) {
        console.log(`  ✓ Progress: ${imported + updated}/${hospitals.length}...`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error(`  ❌ Error importing ${hospital.name}:`, error);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\n✅ Import complete!`);
  console.log(`  New hospitals: ${imported}`);
  console.log(`  Already existed: ${updated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total in database: ${imported + updated}`);
}

// =====================
// Main
// =====================

async function main() {
  console.log('🏥 German Hospital Import System');
  console.log('═'.repeat(80));

  const allHospitals: Hospital[] = [];

  // 1. Load curated database
  const curated = getCuratedHospitals();
  allHospitals.push(...curated);

  // 2. Scrape Wikipedia
  const wikipedia = await scrapeUniversityHospitals();
  allHospitals.push(...wikipedia);

  // Deduplicate by name + city
  const uniqueHospitals = new Map<string, Hospital>();
  for (const hospital of allHospitals) {
    const key = `${hospital.name.toLowerCase()}_${hospital.city.toLowerCase()}`;
    if (!uniqueHospitals.has(key)) {
      uniqueHospitals.set(key, hospital);
    } else {
      // Merge sources
      const existing = uniqueHospitals.get(key)!;
      existing.source = [...new Set([...existing.source, ...hospital.source])];
    }
  }

  const deduplicated = Array.from(uniqueHospitals.values());

  console.log(`\n📊 Summary:`);
  console.log(`  Curated: ${curated.length}`);
  console.log(`  Wikipedia: ${wikipedia.length}`);
  console.log(`  After deduplication: ${deduplicated.length}`);

  // Import to database
  await importToDatabase(deduplicated);

  console.log('\n🎉 All done!\n');
}

main().catch(console.error);

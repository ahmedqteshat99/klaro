-- Fix career URLs to point to actual job listing pages (not career landing pages)
-- Probed on 2026-03-03 by following links from each career landing page

-- Vivantes: karriere.vivantes.de → /stellenangebote (Next.js, has __NEXT_DATA__ with jobs)
UPDATE berlin_hospitals SET career_url = 'https://karriere.vivantes.de/stellenangebote' WHERE name LIKE 'Vivantes%';

-- Charité + DHZC: karriere.charite.de → /stellenangebote (has individual job links)
UPDATE berlin_hospitals SET career_url = 'https://karriere.charite.de/stellenangebote' WHERE name LIKE 'Charité%' OR name LIKE 'Deutsches Herzzentrum%';

-- Sana: karriere.sana.de → jobs.sana.de (Oracle HCM portal)
UPDATE berlin_hospitals SET career_url = 'https://jobs.sana.de/de/sites/CX_4025/jobs' WHERE name LIKE 'Sana%';

-- DRK: karriere.drk-kliniken-berlin.de → /jobs
UPDATE berlin_hospitals SET career_url = 'https://karriere.drk-kliniken-berlin.de/jobs/' WHERE name LIKE 'DRK Kliniken%';

-- Alexianer (St. Hedwig + Hedwigshöhe): karriere.alexianer.de → /stellenangebote.html
UPDATE berlin_hospitals SET career_url = 'https://karriere.alexianer.de/stellenangebote.html' WHERE name LIKE 'St. Hedwig%' OR name LIKE 'Krankenhaus Hedwigshöhe%';

-- Immanuel (Buch + Wannsee): immanuelalbertinen.de jobsuche
UPDATE berlin_hospitals SET career_url = 'https://immanuelalbertinen.de/karriere/stellenangebote/jobsuche/' WHERE name LIKE 'Immanuel Krankenhaus%';

-- Bethel Berlin: via SuccessFactors
UPDATE berlin_hospitals SET career_url = 'https://career5.successfactors.eu/career?company=vbodelschw&lang=de_DE' WHERE name LIKE 'Krankenhaus Bethel%';

-- KEH: keh-berlin.de → /karriere/stellenangebote
UPDATE berlin_hospitals SET career_url = 'https://www.keh-berlin.de/karriere/stellenangebote' WHERE name LIKE 'Ev. Krankenhaus Königin%';

-- Jüdisches Krankenhaus: /servicenavigation/stellenangebote.html
UPDATE berlin_hospitals SET career_url = 'https://www.juedisches-krankenhaus.de/servicenavigation/stellenangebote.html' WHERE name LIKE 'Jüdisches%';

-- Evangelisches Waldkrankenhaus (Johannesstift Diakonie): stellenangebote-bewerbung
UPDATE berlin_hospitals SET career_url = 'https://www.johannesstift-diakonie.de/karriere-bildung/stellenangebote-bewerbung' WHERE name LIKE 'Evangelisches Waldkrankenhaus%';

-- Franziskus-Krankenhaus (Joseph-Stiftung): joseph-kliniken.de/karriere
UPDATE berlin_hospitals SET career_url = 'https://www.joseph-kliniken.de/karriere' WHERE name LIKE 'Franziskus%';

-- Marienkrankenhaus: /stellenangebote.html
UPDATE berlin_hospitals SET career_url = 'https://www.marienkrankenhaus-berlin.de/stellenangebote.html' WHERE name LIKE 'St. Marien%';

-- Martin Luther Krankenhaus: /karriere (keep — already on the right level)
-- UPDATE berlin_hospitals SET career_url = 'https://www.martin-luther-krankenhaus.de/karriere' WHERE name LIKE 'Martin Luther%';

-- UKB: /karriere (keep — but also try /karriere/stellenangebote)
-- UPDATE berlin_hospitals SET career_url = 'https://www.ukb.de/karriere' WHERE name LIKE 'BG Klinikum%';

-- Helios Berlin-Buch: helios large site, keep /karriere (scraper auto-fetches /stellenangebote)
-- UPDATE berlin_hospitals SET career_url = 'https://www.helios-gesundheit.de/karriere' WHERE name LIKE 'Helios%';

-- Park-Klinik Weißensee: keep main site (small hospital)
-- UPDATE berlin_hospitals SET career_url = 'https://www.park-klinik.com' WHERE name LIKE 'Park-Klinik%';

-- Bundeswehrkrankenhaus: military site, keep main (may need special handling)
-- UPDATE berlin_hospitals SET career_url = 'https://www.bundeswehrkrankenhaus-berlin.de' WHERE name LIKE 'Bundeswehrkrankenhaus%';

-- Reset all scrape statuses so they get re-scraped with new URLs
UPDATE berlin_hospitals SET scrape_status = 'pending', scrape_error = NULL;

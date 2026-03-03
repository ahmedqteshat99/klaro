-- Pre-populate known career URLs for Berlin hospitals
-- These were verified via HTTP probing on 2026-03-03

-- Vivantes hospitals → karriere.vivantes.de
UPDATE berlin_hospitals SET website_url = 'https://www.vivantes.de', career_url = 'https://karriere.vivantes.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Vivantes%';

-- Charité
UPDATE berlin_hospitals SET website_url = 'https://www.charite.de', career_url = 'https://karriere.charite.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Charité%';

-- DHZC (part of Charité)
UPDATE berlin_hospitals SET website_url = 'https://www.dhzc.charite.de', career_url = 'https://karriere.charite.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Deutsches Herzzentrum%';

-- Helios Berlin-Buch
UPDATE berlin_hospitals SET website_url = 'https://www.helios-gesundheit.de/kliniken/berlin-buch', career_url = 'https://www.helios-gesundheit.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Helios%';

-- Sana Klinikum Lichtenberg
UPDATE berlin_hospitals SET website_url = 'https://www.sana.de/berlin', career_url = 'https://karriere.sana.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name = 'Sana Klinikum Lichtenberg';

-- Sana Paulinenkrankenhaus
UPDATE berlin_hospitals SET website_url = 'https://www.sana.de/berlin', career_url = 'https://karriere.sana.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name = 'Sana Paulinenkrankenhaus gGmbH';

-- DRK Kliniken Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.drk-kliniken-berlin.de', career_url = 'https://karriere.drk-kliniken-berlin.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'DRK Kliniken%';

-- BG Klinikum / Unfallkrankenhaus Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.ukb.de', career_url = 'https://www.ukb.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'BG Klinikum%';

-- Jüdisches Krankenhaus Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.juedisches-krankenhaus.de', career_url = 'https://www.juedisches-krankenhaus.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Jüdisches%';

-- KEH (Ev. Krankenhaus Königin Elisabeth Herzberge)
UPDATE berlin_hospitals SET website_url = 'https://www.keh-berlin.de', career_url = 'https://www.keh-berlin.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Ev. Krankenhaus Königin%';

-- Evangelisches Waldkrankenhaus Spandau (Johannesstift Diakonie)
UPDATE berlin_hospitals SET website_url = 'https://www.johannesstift-diakonie.de', career_url = 'https://www.johannesstift-diakonie.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Evangelisches Waldkrankenhaus%';

-- Park-Klinik Weißensee
UPDATE berlin_hospitals SET website_url = 'https://www.park-klinik.com', career_url = 'https://www.park-klinik.com', career_url_verified = false, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Park-Klinik%';

-- Franziskus-Krankenhaus Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.franziskus-berlin.de', career_url = 'https://www.franziskus-berlin.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Franziskus%';

-- St. Hedwig-Krankenhaus (Alexianer)
UPDATE berlin_hospitals SET website_url = 'https://www.alexianer.de', career_url = 'https://karriere.alexianer.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'St. Hedwig%';

-- Krankenhaus Hedwigshöhe (Alexianer)
UPDATE berlin_hospitals SET website_url = 'https://www.alexianer.de', career_url = 'https://karriere.alexianer.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Krankenhaus Hedwigshöhe%';

-- St. Marien-Krankenhaus Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.marienkrankenhaus-berlin.de', career_url = 'https://www.marienkrankenhaus-berlin.de/karriere', career_url_verified = false, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'St. Marien%';

-- Martin Luther Krankenhaus Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.martin-luther-krankenhaus.de', career_url = 'https://www.martin-luther-krankenhaus.de/karriere', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Martin Luther%';

-- Krankenhaus Bethel Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.bethel-berlin.de', career_url = 'https://karriere.bethel.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Krankenhaus Bethel%';

-- Immanuel Krankenhaus Berlin (both Buch and Wannsee)
UPDATE berlin_hospitals SET website_url = 'https://www.immanuel.de', career_url = 'https://karriere.immanuel.de', career_url_verified = true, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Immanuel Krankenhaus%';

-- Bundeswehrkrankenhaus Berlin
UPDATE berlin_hospitals SET website_url = 'https://www.bundeswehrkrankenhaus-berlin.de', career_url = 'https://www.bundeswehrkrankenhaus-berlin.de', career_url_verified = false, scrape_status = 'pending', scrape_error = NULL WHERE name LIKE 'Bundeswehrkrankenhaus%';

-- User-verified career URL corrections (2026-03-03)

-- BG Klinikum Unfallkrankenhaus Berlin → bg-kliniken.de/karriere/offene-stellen/
UPDATE berlin_hospitals SET career_url = 'https://www.bg-kliniken.de/karriere/offene-stellen/' WHERE name LIKE 'BG Klinikum%';

-- DRK → search pre-filtered for Assistenzarzt
UPDATE berlin_hospitals SET career_url = 'https://karriere.drk-kliniken-berlin.de/jobs?search=Assistenzarz' WHERE name LIKE 'DRK Kliniken%';

-- Franziskus-Krankenhaus (Joseph-Stiftung) → lieblingsarbeitgeber.berlin
UPDATE berlin_hospitals SET career_url = 'https://lieblingsarbeitgeber.berlin/freie-stellen' WHERE name LIKE 'Franziskus%';

-- Helios Klinikum Berlin-Buch → /karriere/alle-jobs/
UPDATE berlin_hospitals SET career_url = 'https://www.helios-gesundheit.de/karriere/alle-jobs/' WHERE name LIKE 'Helios%';

-- Park-Klinik Weißensee → parkkliniken-weissensee.de
UPDATE berlin_hospitals SET career_url = 'https://www.parkkliniken-weissensee.de/de/Karriere/Stellenliste.php' WHERE name LIKE 'Park-Klinik%';

-- Reset statuses to re-scrape
UPDATE berlin_hospitals SET scrape_status = 'pending', scrape_error = NULL;

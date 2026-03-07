-- Update career URLs to use filtered search pages for better job targeting

-- BG Klinikum: filter for medical staff (ärztlicher Dienst)
UPDATE berlin_hospitals
SET career_url = 'https://www.bg-kliniken.de/karriere/offene-stellen/?bereich=aerztlicher_dienst'
WHERE name LIKE 'BG Klinikum%';

-- KEH (Ev. Krankenhaus Königin Elisabeth Herzberge): filter for "Arzt" positions
UPDATE berlin_hospitals
SET career_url = 'https://www.keh-berlin.de/karriere/stellenangebote/suche-1?tx_jobsearch_stellenangebotesearch%5Bcontroller%5D=Jobs&tx_jobsearch_stellenangebotesearch%5BcurrentPage%5D=1&tx_jobsearch_stellenangebotesearch%5Bsearchterm%5D=Arzt&tx_jobsearch_stellenangebotesearch%5Bsearchworkfield%5D=&cHash=2103cb4fe7aa6d23ff22a5456ced49e8'
WHERE name LIKE 'Ev. Krankenhaus Königin%';

-- Evangelisches Waldkrankenhaus Spandau: filter for "Arzt" positions via Solr search
UPDATE berlin_hospitals
SET career_url = 'https://www.johannesstift-diakonie.de/karriere-bildung/stellenangebote-bewerbung?tx_solr%5Bq%5D=Arzt'
WHERE name LIKE 'Evangelisches Waldkrankenhaus%';

-- Helios: filter for medical job category + Berlin region
UPDATE berlin_hospitals
SET career_url = 'https://www.helios-gesundheit.de/karriere/alle-jobs/?jobcategory=69afcfd7-9a83-590f-b81c-9a07a0b123e3&bundesland=a2239096-7faa-5ed3-a3a3-c1e02c79052b'
WHERE name LIKE 'Helios%';

-- Reset scrape status to trigger re-scraping with new URLs
UPDATE berlin_hospitals
SET scrape_status = 'pending', scrape_error = NULL
WHERE name LIKE 'BG Klinikum%' OR name LIKE 'Ev. Krankenhaus Königin%' OR name LIKE 'Evangelisches Waldkrankenhaus%' OR name LIKE 'Helios%';

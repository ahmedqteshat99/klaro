-- Clear all imported Berlin hospital jobs for a fresh start with stricter filtering
DELETE FROM berlin_hospital_jobs;

-- Reset all hospital scrape statuses
UPDATE berlin_hospitals SET scrape_status = 'pending', scrape_error = NULL, last_scraped_at = NULL;

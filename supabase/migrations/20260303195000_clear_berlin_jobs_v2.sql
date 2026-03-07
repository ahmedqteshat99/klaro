-- Clear all berlin hospital jobs again for clean re-scan with dedup fixes
DELETE FROM berlin_hospital_jobs;
UPDATE berlin_hospitals SET scrape_status = 'pending', scrape_error = NULL, last_scraped_at = NULL;

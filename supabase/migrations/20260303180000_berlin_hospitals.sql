-- Berlin Hospital Job Tracker — Tables, Seed Data, and RLS
-- Creates berlin_hospitals and berlin_hospital_jobs for private admin tracking

-- =============================================
-- Table: berlin_hospitals
-- =============================================
CREATE TABLE IF NOT EXISTS berlin_hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  website_url text,
  career_url text,
  career_url_verified boolean DEFAULT false,
  dkv_url text,
  last_scraped_at timestamptz,
  scrape_status text DEFAULT 'pending' CHECK (scrape_status IN ('pending', 'success', 'error', 'no_jobs', 'needs_manual')),
  scrape_error text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint on hospital name
ALTER TABLE berlin_hospitals ADD CONSTRAINT berlin_hospitals_name_unique UNIQUE (name);

-- =============================================
-- Table: berlin_hospital_jobs
-- =============================================
CREATE TABLE IF NOT EXISTS berlin_hospital_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES berlin_hospitals(id) ON DELETE CASCADE,
  title text NOT NULL,
  department text,
  apply_url text,
  description text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  consecutive_misses integer DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'gone', 'applied')),
  is_new boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one job per hospital+URL
ALTER TABLE berlin_hospital_jobs ADD CONSTRAINT berlin_hospital_jobs_hospital_url_unique UNIQUE (hospital_id, apply_url);

-- Index for fast lookups
CREATE INDEX idx_berlin_hospital_jobs_hospital ON berlin_hospital_jobs(hospital_id);
CREATE INDEX idx_berlin_hospital_jobs_status ON berlin_hospital_jobs(status);
CREATE INDEX idx_berlin_hospitals_scrape ON berlin_hospitals(is_active, last_scraped_at);

-- =============================================
-- RLS: Admin-only access
-- =============================================
ALTER TABLE berlin_hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE berlin_hospital_jobs ENABLE ROW LEVEL SECURITY;

-- berlin_hospitals: admin read/write
CREATE POLICY "admin_read_berlin_hospitals" ON berlin_hospitals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "admin_write_berlin_hospitals" ON berlin_hospitals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- berlin_hospital_jobs: admin read/write
CREATE POLICY "admin_read_berlin_hospital_jobs" ON berlin_hospital_jobs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "admin_write_berlin_hospital_jobs" ON berlin_hospital_jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'ADMIN')
  );

-- =============================================
-- Seed Data: 29 Berlin Hospitals with Innere Medizin
-- =============================================
INSERT INTO berlin_hospitals (name, dkv_url) VALUES
  ('Charité – Universitätsmedizin Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/28475032679be264/start'),
  ('Deutsches Herzzentrum der Charité (DHZC)', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/dd813815d5be72a1/start'),
  ('Vivantes Auguste-Viktoria-Klinikum', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/1f30be98aa6cf848/start'),
  ('Vivantes Humboldt-Klinikum', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/7c456f0f00d744ab/start'),
  ('Vivantes Klinikum Am Urban', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/38188a5bab68126a/start'),
  ('Vivantes Klinikum im Friedrichshain', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/8393831d493068f0/start'),
  ('Vivantes Klinikum Kaulsdorf', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/c2e4f2f0f03601ca/start'),
  ('Vivantes Klinikum Neukölln', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/376cdb0495f7d61a/start'),
  ('Vivantes Klinikum Spandau', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/35a14129eb15e7ab/start'),
  ('Vivantes Wenckebach-Klinikum', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/06b615a75614ef44/start'),
  ('Helios Klinikum Berlin-Buch', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/838c8cff08f2e871/start'),
  ('Sana Klinikum Lichtenberg', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/d3a310c8e6220d8e/start'),
  ('Sana Paulinenkrankenhaus gGmbH', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/d09da58c657d01d6/start'),
  ('DRK Kliniken Berlin Mitte', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/5c7613844c116206/start'),
  ('DRK Kliniken Berlin Westend', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/72a74b04f5248e36/start'),
  ('BG Klinikum Unfallkrankenhaus Berlin gGmbH', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/ba02847536ccca4d/start'),
  ('Jüdisches Krankenhaus Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/1378404f8db73190/start'),
  ('Ev. Krankenhaus Königin Elisabeth Herzberge', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/52ab2c786693d8ae/start'),
  ('Evangelisches Waldkrankenhaus Spandau', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/b90fb7570780317d/start'),
  ('Park-Klinik Weißensee', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/654755a0da99ed60/start'),
  ('Franziskus-Krankenhaus Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/d231565d6bfbe472/start'),
  ('St. Hedwig-Krankenhaus Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/0024b3cbaa1c563b/start'),
  ('Krankenhaus Hedwigshöhe', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/af3c708151e0586c/start'),
  ('St. Marien-Krankenhaus Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/1a1981e015b7ad14/start'),
  ('Martin Luther Krankenhaus Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/a9f4e9b624332bd8/start'),
  ('Krankenhaus Bethel Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/74f1a27f4a3c5ca2/start'),
  ('Immanuel Krankenhaus Berlin – Standort Buch', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/7fb9a90b0eb51b3e/start'),
  ('Immanuel Krankenhaus Berlin – Standort Wannsee', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/e7ffec2978be0eeb/start'),
  ('Bundeswehrkrankenhaus Berlin', 'https://www.deutsches-krankenhaus-verzeichnis.de/app/portrait/6a1e2e824a930200/start')
ON CONFLICT (name) DO NOTHING;

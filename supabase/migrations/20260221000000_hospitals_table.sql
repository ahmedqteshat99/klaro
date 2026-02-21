-- Create hospitals table for comprehensive German hospital directory
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Official identifier (Institutionskennzeichen - unique hospital ID in Germany)
  iknr TEXT UNIQUE,

  -- Basic information
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL, -- for deduplication: lowercase, no special chars
  type TEXT, -- 'Universitätsklinikum', 'Krankenhaus', 'Fachklinik', 'Rehabilitationsklinik'

  -- Contact information
  website TEXT,
  career_page_url TEXT,
  career_platform TEXT, -- 'softgarden', 'personio', 'rexx', 'successfactors', 'custom'
  email TEXT,
  phone TEXT,

  -- Address
  street TEXT,
  plz TEXT,
  city TEXT NOT NULL,
  bundesland TEXT NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Hospital metadata
  beds_count INTEGER,
  case_count INTEGER, -- annual patient cases
  departments JSONB, -- Array of Fachabteilungen: ["Innere Medizin", "Chirurgie", ...]

  -- Data provenance and quality
  source TEXT[] DEFAULT ARRAY[]::TEXT[], -- ['gba', 'destatis', 'dkg', 'state_bayern', 'google']
  verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  data_quality_score INTEGER DEFAULT 0, -- 0-100, based on completeness

  -- Scraping metadata
  last_scraped_at TIMESTAMPTZ,
  last_scrape_success BOOLEAN,
  scrape_success_count INTEGER DEFAULT 0,
  scrape_error_count INTEGER DEFAULT 0,
  last_error_message TEXT,

  -- Status flags
  is_active BOOLEAN DEFAULT true,
  has_job_postings BOOLEAN DEFAULT false,
  job_postings_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_hospitals_iknr ON hospitals(iknr) WHERE iknr IS NOT NULL;
CREATE INDEX idx_hospitals_name_normalized ON hospitals(name_normalized);
CREATE INDEX idx_hospitals_plz_city ON hospitals(plz, city);
CREATE INDEX idx_hospitals_bundesland ON hospitals(bundesland);
CREATE INDEX idx_hospitals_last_scraped ON hospitals(last_scraped_at NULLS FIRST);
CREATE INDEX idx_hospitals_verified ON hospitals(verified) WHERE verified = true;
CREATE INDEX idx_hospitals_active ON hospitals(is_active) WHERE is_active = true;
CREATE INDEX idx_hospitals_has_jobs ON hospitals(has_job_postings) WHERE has_job_postings = true;

-- Composite index for deduplication checks
CREATE UNIQUE INDEX idx_hospitals_dedup ON hospitals(name_normalized, plz)
WHERE is_active = true;

-- Simple index for geospatial queries (basic lat/lng indexing)
CREATE INDEX idx_hospitals_lat_lng ON hospitals(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Function to update data quality score
CREATE OR REPLACE FUNCTION calculate_hospital_quality_score(h hospitals)
RETURNS INTEGER AS $$
DECLARE
  score INTEGER := 0;
BEGIN
  -- Base fields (50 points)
  IF h.name IS NOT NULL THEN score := score + 5; END IF;
  IF h.iknr IS NOT NULL THEN score := score + 10; END IF;
  IF h.website IS NOT NULL THEN score := score + 10; END IF;
  IF h.career_page_url IS NOT NULL THEN score := score + 15; END IF;
  IF h.plz IS NOT NULL THEN score := score + 5; END IF;
  IF h.city IS NOT NULL THEN score := score + 5; END IF;

  -- Contact info (20 points)
  IF h.email IS NOT NULL THEN score := score + 10; END IF;
  IF h.phone IS NOT NULL THEN score := score + 10; END IF;

  -- Metadata (20 points)
  IF h.beds_count IS NOT NULL THEN score := score + 5; END IF;
  IF h.departments IS NOT NULL AND jsonb_array_length(h.departments) > 0 THEN score := score + 10; END IF;
  IF h.latitude IS NOT NULL AND h.longitude IS NOT NULL THEN score := score + 5; END IF;

  -- Data quality indicators (10 points)
  IF h.verified THEN score := score + 5; END IF;
  IF array_length(h.source, 1) >= 2 THEN score := score + 5; END IF; -- Multiple sources = more reliable

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to update quality score on insert/update
CREATE OR REPLACE FUNCTION update_hospital_quality_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_quality_score := calculate_hospital_quality_score(NEW);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hospital_quality_score
  BEFORE INSERT OR UPDATE ON hospitals
  FOR EACH ROW
  EXECUTE FUNCTION update_hospital_quality_score();

-- Function to normalize hospital names for deduplication
CREATE OR REPLACE FUNCTION normalize_hospital_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(name, '[äÄ]', 'ae', 'g'),
            '[öÖ]', 'oe', 'g'
          ),
          '[üÜ]', 'ue', 'g'
        ),
        'ß', 'ss', 'g'
      ),
      '[^a-z0-9]', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-populate name_normalized
CREATE OR REPLACE FUNCTION set_hospital_name_normalized()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_normalized := normalize_hospital_name(NEW.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_hospital_name_normalized
  BEFORE INSERT OR UPDATE OF name ON hospitals
  FOR EACH ROW
  EXECUTE FUNCTION set_hospital_name_normalized();

-- RLS policies (admin-only for now)
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY admin_all_hospitals ON hospitals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Public can read verified hospitals
CREATE POLICY public_read_hospitals ON hospitals
  FOR SELECT
  TO public
  USING (verified = true AND is_active = true);

-- Grant permissions
GRANT SELECT ON hospitals TO anon, authenticated;
GRANT ALL ON hospitals TO service_role;

-- Comments for documentation
COMMENT ON TABLE hospitals IS 'Comprehensive directory of German hospitals for job scraping';
COMMENT ON COLUMN hospitals.iknr IS 'Institutionskennzeichen - official unique hospital identifier in Germany';
COMMENT ON COLUMN hospitals.name_normalized IS 'Normalized name for deduplication (lowercase, no umlauts, no special chars)';
COMMENT ON COLUMN hospitals.career_platform IS 'Detected career page platform for optimized scraping';
COMMENT ON COLUMN hospitals.data_quality_score IS 'Auto-calculated score (0-100) based on data completeness';

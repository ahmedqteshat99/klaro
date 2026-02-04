-- =============================================
-- Assistenzarzt Pro - Complete Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  vorname VARCHAR(255) NOT NULL,
  nachname VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefon VARCHAR(50),
  stadt VARCHAR(255),
  geburtsdatum DATE,
  staatsangehoerigkeit VARCHAR(255),
  familienstand VARCHAR(100),
  fachrichtung VARCHAR(255),
  deutschniveau VARCHAR(50),
  approbationsstatus VARCHAR(100),
  berufserfahrung_jahre INTEGER,
  foto_url TEXT,
  signatur_url TEXT,
  cv_text TEXT,
  interessen TEXT,
  edv_kenntnisse TEXT[],
  medizinische_kenntnisse TEXT[],
  sprachkenntnisse TEXT[],
  visibility_status VARCHAR(50) DEFAULT 'private',
  share_consent BOOLEAN DEFAULT FALSE,
  share_consent_at TIMESTAMPTZ,
  dsgvo_einwilligung BOOLEAN DEFAULT FALSE,
  dsgvo_einwilligung_datum TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work experiences table
CREATE TABLE IF NOT EXISTS work_experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  klinik VARCHAR(255) NOT NULL,
  station VARCHAR(255),
  taetigkeiten TEXT,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Education entries table
CREATE TABLE IF NOT EXISTS education_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  universitaet VARCHAR(255) NOT NULL,
  abschluss VARCHAR(255),
  abschlussarbeit TEXT,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Practical experiences table
CREATE TABLE IF NOT EXISTS practical_experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  einrichtung VARCHAR(255) NOT NULL,
  fachbereich VARCHAR(255),
  typ VARCHAR(100),
  beschreibung TEXT,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  aussteller VARCHAR(255),
  datum DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Publications table
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  titel VARCHAR(500) NOT NULL,
  typ VARCHAR(100),
  journal_ort VARCHAR(255),
  datum DATE,
  beschreibung TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document versions table
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  typ VARCHAR(50) NOT NULL,
  html_content TEXT NOT NULL,
  input_snapshot JSONB,
  hospital_name VARCHAR(255),
  department_or_specialty VARCHAR(255),
  position_title VARCHAR(255),
  job_url TEXT,
  applied BOOLEAN DEFAULT FALSE,
  applied_date DATE,
  show_foto BOOLEAN DEFAULT TRUE,
  show_signatur BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate share requests table
CREATE TABLE IF NOT EXISTS candidate_share_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_user_id UUID NOT NULL,
  hospital_id UUID,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON profiles(visibility_status);
CREATE INDEX IF NOT EXISTS idx_work_experiences_user_id ON work_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_education_entries_user_id ON education_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_practical_experiences_user_id ON practical_experiences(user_id);
CREATE INDEX IF NOT EXISTS idx_certifications_user_id ON certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_publications_user_id ON publications(user_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_user_id ON document_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_typ ON document_versions(typ);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_experiences_updated_at
  BEFORE UPDATE ON work_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_education_entries_updated_at
  BEFORE UPDATE ON education_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practical_experiences_updated_at
  BEFORE UPDATE ON practical_experiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_versions_updated_at
  BEFORE UPDATE ON document_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE practical_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_share_requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (is_admin(auth.uid()));

-- Work experiences policies
CREATE POLICY "Users can manage own work experiences" ON work_experiences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all work experiences" ON work_experiences
  FOR SELECT USING (is_admin(auth.uid()));

-- Education entries policies
CREATE POLICY "Users can manage own education" ON education_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all education" ON education_entries
  FOR SELECT USING (is_admin(auth.uid()));

-- Practical experiences policies
CREATE POLICY "Users can manage own practical experiences" ON practical_experiences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all practical experiences" ON practical_experiences
  FOR SELECT USING (is_admin(auth.uid()));

-- Certifications policies
CREATE POLICY "Users can manage own certifications" ON certifications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all certifications" ON certifications
  FOR SELECT USING (is_admin(auth.uid()));

-- Publications policies
CREATE POLICY "Users can manage own publications" ON publications
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all publications" ON publications
  FOR SELECT USING (is_admin(auth.uid()));

-- Document versions policies
CREATE POLICY "Users can manage own documents" ON document_versions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents" ON document_versions
  FOR SELECT USING (is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (is_admin(auth.uid()));

-- Candidate share requests policies
CREATE POLICY "Users can view own share requests" ON candidate_share_requests
  FOR SELECT USING (auth.uid() = candidate_user_id);

CREATE POLICY "Admins can manage all share requests" ON candidate_share_requests
  FOR ALL USING (is_admin(auth.uid()));

-- =============================================
-- STORAGE BUCKETS (run separately in Supabase Dashboard)
-- =============================================
-- Note: Storage buckets need to be created via Supabase Dashboard or API
-- 1. Create bucket "avatars" for profile photos
-- 2. Create bucket "signatures" for signature images
-- Set both to public or configure appropriate policies

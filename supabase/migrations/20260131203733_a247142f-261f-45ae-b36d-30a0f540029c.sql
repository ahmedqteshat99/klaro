-- Create profiles table (stores all doctor profile data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Personal data
  vorname TEXT NOT NULL,
  nachname TEXT NOT NULL,
  geburtsdatum DATE,
  staatsangehoerigkeit TEXT,
  familienstand TEXT,
  stadt TEXT,
  email TEXT,
  telefon TEXT,
  foto_url TEXT,
  signatur_url TEXT,
  -- Professional profile
  fachrichtung TEXT,
  approbationsstatus TEXT,
  deutschniveau TEXT CHECK (deutschniveau IN ('B1', 'B2', 'C1', 'C2')),
  berufserfahrung_jahre INTEGER DEFAULT 0,
  cv_text TEXT,
  -- Skills (stored as arrays)
  medizinische_kenntnisse TEXT[] DEFAULT '{}',
  edv_kenntnisse TEXT[] DEFAULT '{}',
  sprachkenntnisse TEXT[] DEFAULT '{}',
  interessen TEXT,
  -- GDPR consent
  dsgvo_einwilligung BOOLEAN DEFAULT false,
  dsgvo_einwilligung_datum TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create work_experiences table
CREATE TABLE IF NOT EXISTS public.work_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  klinik TEXT NOT NULL,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  station TEXT,
  taetigkeiten TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create education_entries table
CREATE TABLE IF NOT EXISTS public.education_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  universitaet TEXT NOT NULL,
  abschluss TEXT,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  abschlussarbeit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create practical_experiences table (Famulaturen, PJ, Hospitationen)
CREATE TABLE IF NOT EXISTS public.practical_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  typ TEXT CHECK (typ IN ('Famulatur', 'PJ', 'Hospitation')),
  einrichtung TEXT NOT NULL,
  fachbereich TEXT,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  beschreibung TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create certifications table
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  aussteller TEXT,
  datum DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create publications table
CREATE TABLE IF NOT EXISTS public.publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  typ TEXT CHECK (typ IN ('Publikation', 'Kongress', 'Poster', 'Vortrag', 'Doktorarbeit')),
  titel TEXT NOT NULL,
  journal_ort TEXT,
  datum DATE,
  beschreibung TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create document_versions table (saved CVs and cover letters)
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  typ TEXT NOT NULL CHECK (typ IN ('CV', 'Anschreiben')),
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  input_snapshot JSONB,
  show_foto BOOLEAN DEFAULT true,
  show_signatur BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practical_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for work_experiences
CREATE POLICY "Users can view their own work experiences"
  ON public.work_experiences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own work experiences"
  ON public.work_experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work experiences"
  ON public.work_experiences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own work experiences"
  ON public.work_experiences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for education_entries
CREATE POLICY "Users can view their own education entries"
  ON public.education_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own education entries"
  ON public.education_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own education entries"
  ON public.education_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own education entries"
  ON public.education_entries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for practical_experiences
CREATE POLICY "Users can view their own practical experiences"
  ON public.practical_experiences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own practical experiences"
  ON public.practical_experiences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practical experiences"
  ON public.practical_experiences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own practical experiences"
  ON public.practical_experiences FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for certifications
CREATE POLICY "Users can view their own certifications"
  ON public.certifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certifications"
  ON public.certifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certifications"
  ON public.certifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own certifications"
  ON public.certifications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for publications
CREATE POLICY "Users can view their own publications"
  ON public.publications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own publications"
  ON public.publications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own publications"
  ON public.publications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own publications"
  ON public.publications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for document_versions
CREATE POLICY "Users can view their own document versions"
  ON public.document_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document versions"
  ON public.document_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document versions"
  ON public.document_versions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document versions"
  ON public.document_versions FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers to all tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_experiences_updated_at ON public.work_experiences;
CREATE TRIGGER update_work_experiences_updated_at
  BEFORE UPDATE ON public.work_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_education_entries_updated_at ON public.education_entries;
CREATE TRIGGER update_education_entries_updated_at
  BEFORE UPDATE ON public.education_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_practical_experiences_updated_at ON public.practical_experiences;
CREATE TRIGGER update_practical_experiences_updated_at
  BEFORE UPDATE ON public.practical_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_certifications_updated_at ON public.certifications;
CREATE TRIGGER update_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_publications_updated_at ON public.publications;
CREATE TRIGGER update_publications_updated_at
  BEFORE UPDATE ON public.publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_versions_updated_at ON public.document_versions;
CREATE TRIGGER update_document_versions_updated_at
  BEFORE UPDATE ON public.document_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for user files (photos, signatures)
INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false);

-- Storage RLS policies
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

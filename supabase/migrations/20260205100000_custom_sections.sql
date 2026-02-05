-- Custom sections for CV import (data that doesn't fit existing categories)

CREATE TABLE custom_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL,
  section_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE custom_section_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES custom_sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  datum DATE,
  zeitraum_von DATE,
  zeitraum_bis DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_custom_sections_user_id ON custom_sections(user_id);
CREATE INDEX idx_custom_section_entries_section_id ON custom_section_entries(section_id);
CREATE INDEX idx_custom_section_entries_user_id ON custom_section_entries(user_id);

-- Enable RLS
ALTER TABLE custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_section_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_sections
CREATE POLICY "Users can view own custom_sections"
  ON custom_sections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom_sections"
  ON custom_sections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom_sections"
  ON custom_sections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom_sections"
  ON custom_sections FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for custom_section_entries
CREATE POLICY "Users can view own custom_section_entries"
  ON custom_section_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom_section_entries"
  ON custom_section_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom_section_entries"
  ON custom_section_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom_section_entries"
  ON custom_section_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_custom_sections_updated_at
  BEFORE UPDATE ON custom_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_section_entries_updated_at
  BEFORE UPDATE ON custom_section_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

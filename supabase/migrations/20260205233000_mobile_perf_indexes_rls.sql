-- Mobile performance + RLS refinements

-- Composite indexes for user-scoped ordering
CREATE INDEX IF NOT EXISTS idx_work_experiences_user_zeitraum_von
  ON work_experiences(user_id, zeitraum_von DESC);

CREATE INDEX IF NOT EXISTS idx_education_entries_user_zeitraum_von
  ON education_entries(user_id, zeitraum_von DESC);

CREATE INDEX IF NOT EXISTS idx_practical_experiences_user_zeitraum_von
  ON practical_experiences(user_id, zeitraum_von DESC);

CREATE INDEX IF NOT EXISTS idx_certifications_user_datum
  ON certifications(user_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_publications_user_datum
  ON publications(user_id, datum DESC);

CREATE INDEX IF NOT EXISTS idx_custom_sections_user_order
  ON custom_sections(user_id, section_order);

CREATE INDEX IF NOT EXISTS idx_custom_section_entries_user_created_at
  ON custom_section_entries(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_user_created_at
  ON document_versions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_user_typ_created_at
  ON document_versions(user_id, typ, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_versions_user_typ_applied_created_at
  ON document_versions(user_id, typ, applied, created_at DESC);

-- RLS refinements: ensure entries belong to a section owned by the user
DROP POLICY IF EXISTS "Users can view own custom_section_entries" ON custom_section_entries;
DROP POLICY IF EXISTS "Users can insert own custom_section_entries" ON custom_section_entries;
DROP POLICY IF EXISTS "Users can update own custom_section_entries" ON custom_section_entries;
DROP POLICY IF EXISTS "Users can delete own custom_section_entries" ON custom_section_entries;

CREATE POLICY "Users can view own custom_section_entries"
  ON custom_section_entries FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM custom_sections s
      WHERE s.id = custom_section_entries.section_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own custom_section_entries"
  ON custom_section_entries FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM custom_sections s
      WHERE s.id = custom_section_entries.section_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own custom_section_entries"
  ON custom_section_entries FOR UPDATE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM custom_sections s
      WHERE s.id = custom_section_entries.section_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM custom_sections s
      WHERE s.id = custom_section_entries.section_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own custom_section_entries"
  ON custom_section_entries FOR DELETE
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM custom_sections s
      WHERE s.id = custom_section_entries.section_id
        AND s.user_id = auth.uid()
    )
  );

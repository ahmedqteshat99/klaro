-- Security hardening: prevent ownership transfer on UPDATE and protect admin-only fields

-- Drop legacy broad policies to avoid UPDATE without WITH CHECK
DROP POLICY IF EXISTS "Users can manage own work experiences" ON work_experiences;
DROP POLICY IF EXISTS "Users can manage own education" ON education_entries;
DROP POLICY IF EXISTS "Users can manage own practical experiences" ON practical_experiences;
DROP POLICY IF EXISTS "Users can manage own certifications" ON certifications;
DROP POLICY IF EXISTS "Users can manage own publications" ON publications;
DROP POLICY IF EXISTS "Users can manage own documents" ON document_versions;

-- Recreate UPDATE policies with ownership checks
DROP POLICY IF EXISTS "Users can update their own work experiences" ON work_experiences;
CREATE POLICY "Users can update their own work experiences"
  ON work_experiences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own education entries" ON education_entries;
CREATE POLICY "Users can update their own education entries"
  ON education_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own practical experiences" ON practical_experiences;
CREATE POLICY "Users can update their own practical experiences"
  ON practical_experiences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own certifications" ON certifications;
CREATE POLICY "Users can update their own certifications"
  ON certifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own publications" ON publications;
CREATE POLICY "Users can update their own publications"
  ON publications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own document versions" ON document_versions;
CREATE POLICY "Users can update their own document versions"
  ON document_versions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Custom sections: add WITH CHECK to UPDATE policies
DROP POLICY IF EXISTS "Users can update own custom_sections" ON custom_sections;
CREATE POLICY "Users can update own custom_sections"
  ON custom_sections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Custom section entries: preserve ownership + section ownership checks
DROP POLICY IF EXISTS "Users can update own custom_section_entries" ON custom_section_entries;
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

-- Prevent non-admin updates to admin-only profile fields
CREATE OR REPLACE FUNCTION public.prevent_profile_admin_fields_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    NEW.role := OLD.role;
    NEW.admin_notes := OLD.admin_notes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_admin_fields_update ON profiles;
CREATE TRIGGER prevent_profile_admin_fields_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_admin_fields_update();

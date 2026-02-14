-- ============================================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- ============================================================

-- Drop potentially conflicting old policies
DROP POLICY IF EXISTS "Users can manage own work experiences" ON work_experiences;
DROP POLICY IF EXISTS "Users can view their own work experiences" ON work_experiences;
DROP POLICY IF EXISTS "Users can create their own work experiences" ON work_experiences;
DROP POLICY IF EXISTS "Users can update their own work experiences" ON work_experiences;
DROP POLICY IF EXISTS "Users can delete their own work experiences" ON work_experiences;

-- Recreate clean policies for work_experiences
CREATE POLICY "work_experiences_select" ON work_experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "work_experiences_insert" ON work_experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "work_experiences_update" ON work_experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "work_experiences_delete" ON work_experiences FOR DELETE USING (auth.uid() = user_id);

-- Do the same for other tables that might have issues
DROP POLICY IF EXISTS "Users can manage own education entries" ON education_entries;
DROP POLICY IF EXISTS "Users can view their own education entries" ON education_entries;
DROP POLICY IF EXISTS "Users can create their own education entries" ON education_entries;
DROP POLICY IF EXISTS "Users can update their own education entries" ON education_entries;
DROP POLICY IF EXISTS "Users can delete their own education entries" ON education_entries;

CREATE POLICY "education_entries_select" ON education_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "education_entries_insert" ON education_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "education_entries_update" ON education_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "education_entries_delete" ON education_entries FOR DELETE USING (auth.uid() = user_id);

-- Practical experiences
DROP POLICY IF EXISTS "Users can manage own practical experiences" ON practical_experiences;
DROP POLICY IF EXISTS "Users can view their own practical experiences" ON practical_experiences;
DROP POLICY IF EXISTS "Users can create their own practical experiences" ON practical_experiences;
DROP POLICY IF EXISTS "Users can update their own practical experiences" ON practical_experiences;
DROP POLICY IF EXISTS "Users can delete their own practical experiences" ON practical_experiences;

CREATE POLICY "practical_experiences_select" ON practical_experiences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "practical_experiences_insert" ON practical_experiences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "practical_experiences_update" ON practical_experiences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "practical_experiences_delete" ON practical_experiences FOR DELETE USING (auth.uid() = user_id);

-- Certifications
DROP POLICY IF EXISTS "Users can manage own certifications" ON certifications;
DROP POLICY IF EXISTS "Users can view their own certifications" ON certifications;
DROP POLICY IF EXISTS "Users can create their own certifications" ON certifications;
DROP POLICY IF EXISTS "Users can update their own certifications" ON certifications;
DROP POLICY IF EXISTS "Users can delete their own certifications" ON certifications;

CREATE POLICY "certifications_select" ON certifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "certifications_insert" ON certifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "certifications_update" ON certifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "certifications_delete" ON certifications FOR DELETE USING (auth.uid() = user_id);

-- Publications
DROP POLICY IF EXISTS "Users can manage own publications" ON publications;
DROP POLICY IF EXISTS "Users can view their own publications" ON publications;
DROP POLICY IF EXISTS "Users can create their own publications" ON publications;
DROP POLICY IF EXISTS "Users can update their own publications" ON publications;
DROP POLICY IF EXISTS "Users can delete their own publications" ON publications;

CREATE POLICY "publications_select" ON publications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "publications_insert" ON publications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "publications_update" ON publications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "publications_delete" ON publications FOR DELETE USING (auth.uid() = user_id);

-- Verify policies were applied
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

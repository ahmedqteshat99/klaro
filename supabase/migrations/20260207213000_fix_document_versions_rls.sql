-- Fix RLS for document_versions inserts/reads/deletes

DROP POLICY IF EXISTS "Users can view their own document versions" ON document_versions;
DROP POLICY IF EXISTS "Users can create their own document versions" ON document_versions;
DROP POLICY IF EXISTS "Users can delete their own document versions" ON document_versions;

CREATE POLICY "Users can view their own document versions"
  ON document_versions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own document versions"
  ON document_versions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document versions"
  ON document_versions FOR DELETE
  USING (auth.uid() = user_id);

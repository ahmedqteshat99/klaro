-- Add application tracking fields to document_versions
-- New fields: application_status, notes, followup_date

ALTER TABLE document_versions
  ADD COLUMN IF NOT EXISTS application_status VARCHAR(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS followup_date DATE;

-- Migrate existing data: if applied = true, set status to 'applied'
UPDATE document_versions
SET application_status = 'applied'
WHERE applied = true AND (application_status IS NULL OR application_status = 'draft');

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_document_versions_user_status
  ON document_versions(user_id, application_status, created_at DESC);

COMMENT ON COLUMN document_versions.application_status IS 'Application status: draft, applied, interview, rejected, offer';
COMMENT ON COLUMN document_versions.notes IS 'User notes about this application (contact info, interview details, etc)';
COMMENT ON COLUMN document_versions.followup_date IS 'Optional reminder date for follow-up';

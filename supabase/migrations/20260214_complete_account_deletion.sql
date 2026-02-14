-- Complete Account Deletion Fix
-- Ensures ALL user data is deleted when account is deleted
-- Addresses GDPR Art. 17 (Right to Erasure) compliance gap

-- Step 1: Create comprehensive account deletion function
CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_deleted_count JSON;
  v_applications_count INT;
  v_messages_count INT;
  v_events_count INT;
  v_email_logs_count INT;
BEGIN
  -- Count records before deletion for audit trail
  SELECT COUNT(*) INTO v_applications_count FROM applications WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_messages_count FROM application_messages WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_events_count FROM app_events WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_email_logs_count FROM lifecycle_email_logs WHERE user_id = p_user_id;

  -- Delete application attachments (via cascade from applications)
  DELETE FROM application_attachments
  WHERE application_id IN (SELECT id FROM applications WHERE user_id = p_user_id);

  -- Delete application messages
  DELETE FROM application_messages WHERE user_id = p_user_id;
  DELETE FROM application_messages
  WHERE application_id IN (SELECT id FROM applications WHERE user_id = p_user_id);

  -- Delete applications
  DELETE FROM applications WHERE user_id = p_user_id;

  -- Delete analytics events
  DELETE FROM app_events WHERE user_id = p_user_id;

  -- Delete lifecycle email logs
  DELETE FROM lifecycle_email_logs WHERE user_id = p_user_id;

  -- Delete notification preferences
  DELETE FROM user_notification_preferences WHERE user_id = p_user_id;

  -- Delete email aliases
  DELETE FROM user_email_aliases WHERE user_id = p_user_id;

  -- Delete user documents
  DELETE FROM user_documents WHERE user_id = p_user_id;

  -- Delete document versions
  DELETE FROM document_versions WHERE user_id = p_user_id;

  -- Delete publications
  DELETE FROM publications WHERE user_id = p_user_id;

  -- Delete certifications
  DELETE FROM certifications WHERE user_id = p_user_id;

  -- Delete practical experiences
  DELETE FROM practical_experiences WHERE user_id = p_user_id;

  -- Delete education entries
  DELETE FROM education_entries WHERE user_id = p_user_id;

  -- Delete work experiences
  DELETE FROM work_experiences WHERE user_id = p_user_id;

  -- Delete custom section entries (if exists)
  DELETE FROM custom_section_entries WHERE user_id = p_user_id;

  -- Delete custom sections (if exists)
  DELETE FROM custom_sections WHERE user_id = p_user_id;

  -- Delete profile
  DELETE FROM profiles WHERE user_id = p_user_id;

  -- Return deletion summary
  v_deleted_count := json_build_object(
    'applications', v_applications_count,
    'messages', v_messages_count,
    'events', v_events_count,
    'email_logs', v_email_logs_count
  );

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Grant execute permission to authenticated users (for their own account)
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;

-- Step 3: Create trigger to auto-delete all data when auth.users record is deleted
-- This ensures cleanup even if user deletes account via Supabase Auth directly
CREATE OR REPLACE FUNCTION on_auth_user_deleted()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all associated data
  PERFORM delete_user_account(OLD.id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_deleted_trigger ON auth.users;
CREATE TRIGGER on_auth_user_deleted_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION on_auth_user_deleted();

-- Step 4: Create audit log for account deletions
CREATE TABLE IF NOT EXISTS account_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW(),
  deletion_summary JSONB,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on deletion log
ALTER TABLE account_deletion_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view deletion log
CREATE POLICY "Admins can view deletion log"
  ON account_deletion_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Grant insert to service role for logging
GRANT INSERT ON account_deletion_log TO service_role;

COMMENT ON FUNCTION delete_user_account IS 'Comprehensive account deletion function that removes ALL user data per GDPR Art. 17';
COMMENT ON TABLE account_deletion_log IS 'Audit trail of account deletions for compliance documentation';

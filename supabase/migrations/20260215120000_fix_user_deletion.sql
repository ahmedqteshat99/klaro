-- Fix user deletion issues
-- This migration ensures ALL foreign key constraints are handled

-- Step 1: Update delete_user_account function to handle ALL tables
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
  SELECT COUNT(*) INTO v_messages_count FROM application_messages
    WHERE application_id IN (SELECT id FROM applications WHERE user_id = p_user_id);
  SELECT COUNT(*) INTO v_events_count FROM app_events WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_email_logs_count FROM lifecycle_email_logs WHERE user_id = p_user_id;

  -- Delete in correct order to avoid foreign key violations

  -- 1. Delete application-related data
  DELETE FROM application_attachments
  WHERE application_id IN (SELECT id FROM applications WHERE user_id = p_user_id);

  DELETE FROM application_messages
  WHERE application_id IN (SELECT id FROM applications WHERE user_id = p_user_id);

  DELETE FROM applications WHERE user_id = p_user_id;

  -- 2. Delete analytics and logs
  DELETE FROM app_events WHERE user_id = p_user_id;
  DELETE FROM lifecycle_email_logs WHERE user_id = p_user_id;

  -- 3. Delete user preferences and settings
  DELETE FROM user_notification_preferences WHERE user_id = p_user_id;
  DELETE FROM user_email_aliases WHERE user_id = p_user_id;

  -- 4. Delete documents
  DELETE FROM user_documents WHERE user_id = p_user_id;
  DELETE FROM document_versions WHERE user_id = p_user_id;

  -- 5. Delete profile data
  DELETE FROM publications WHERE user_id = p_user_id;
  DELETE FROM certifications WHERE user_id = p_user_id;
  DELETE FROM practical_experiences WHERE user_id = p_user_id;
  DELETE FROM education_entries WHERE user_id = p_user_id;
  DELETE FROM work_experiences WHERE user_id = p_user_id;

  -- 6. Delete custom sections (if exists)
  DELETE FROM custom_section_entries WHERE user_id = p_user_id;
  DELETE FROM custom_sections WHERE user_id = p_user_id;

  -- 7. Delete admin audit logs where this user was the deleted_by
  -- Set to NULL instead of deleting to preserve audit trail
  UPDATE account_deletion_log
  SET deleted_by = NULL
  WHERE deleted_by = p_user_id;

  -- 8. Delete jobs created by user (set to NULL per existing constraint)
  -- No action needed - already has ON DELETE SET NULL

  -- 9. Finally delete profile (must be last)
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

-- Step 2: Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_auth_user_deleted_trigger ON auth.users;
CREATE TRIGGER on_auth_user_deleted_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION on_auth_user_deleted();

-- Step 3: Ensure proper permissions
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_account(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION on_auth_user_deleted() TO service_role;

-- Step 4: Update account_deletion_log foreign key to allow NULL
-- This prevents deletion failures when an admin who deleted users is themselves deleted
ALTER TABLE account_deletion_log
DROP CONSTRAINT IF EXISTS account_deletion_log_deleted_by_fkey;

ALTER TABLE account_deletion_log
ADD CONSTRAINT account_deletion_log_deleted_by_fkey
FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON FUNCTION delete_user_account IS 'Comprehensive account deletion function that removes ALL user data per GDPR Art. 17 - Updated 2026-02-15';

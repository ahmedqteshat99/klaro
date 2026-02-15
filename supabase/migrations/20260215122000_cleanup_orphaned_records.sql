-- Clean up orphaned records before adding CASCADE constraints
-- These are records that reference users that no longer exist in auth.users

-- Step 1: Find and delete orphaned profiles
DELETE FROM profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 2: Find and delete orphaned work experiences
DELETE FROM work_experiences
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 3: Find and delete orphaned education entries
DELETE FROM education_entries
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 4: Find and delete orphaned practical experiences
DELETE FROM practical_experiences
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 5: Find and delete orphaned certifications
DELETE FROM certifications
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 6: Find and delete orphaned publications
DELETE FROM publications
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 7: Find and delete orphaned document versions
DELETE FROM document_versions
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 8: Find and delete orphaned applications
DELETE FROM applications
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 9: Find and delete orphaned user documents
DELETE FROM user_documents
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 10: Clean up optional tables (if they exist)
DO $$
BEGIN
  -- Custom sections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_sections') THEN
    DELETE FROM custom_sections WHERE user_id NOT IN (SELECT id FROM auth.users);
  END IF;

  -- Custom section entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_section_entries') THEN
    DELETE FROM custom_section_entries WHERE user_id NOT IN (SELECT id FROM auth.users);
  END IF;

  -- User email aliases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_email_aliases') THEN
    DELETE FROM user_email_aliases WHERE user_id NOT IN (SELECT id FROM auth.users);
  END IF;

  -- User notification preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notification_preferences') THEN
    DELETE FROM user_notification_preferences WHERE user_id NOT IN (SELECT id FROM auth.users);
  END IF;

  -- Lifecycle email logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lifecycle_email_logs') THEN
    DELETE FROM lifecycle_email_logs WHERE user_id NOT IN (SELECT id FROM auth.users);
  END IF;

  -- App events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
    DELETE FROM app_events WHERE user_id NOT IN (SELECT id FROM auth.users);
  END IF;
END$$;

-- Cleanup complete - orphaned records removed

-- Add CASCADE constraints to all user-related foreign keys
-- This ensures when a user is deleted, all their data is automatically removed

-- Profiles (must have CASCADE since it's the core user table)
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Work experiences
ALTER TABLE work_experiences
DROP CONSTRAINT IF EXISTS work_experiences_user_id_fkey;

ALTER TABLE work_experiences
ADD CONSTRAINT work_experiences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Education entries
ALTER TABLE education_entries
DROP CONSTRAINT IF EXISTS education_entries_user_id_fkey;

ALTER TABLE education_entries
ADD CONSTRAINT education_entries_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Practical experiences
ALTER TABLE practical_experiences
DROP CONSTRAINT IF EXISTS practical_experiences_user_id_fkey;

ALTER TABLE practical_experiences
ADD CONSTRAINT practical_experiences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Certifications
ALTER TABLE certifications
DROP CONSTRAINT IF EXISTS certifications_user_id_fkey;

ALTER TABLE certifications
ADD CONSTRAINT certifications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Publications
ALTER TABLE publications
DROP CONSTRAINT IF EXISTS publications_user_id_fkey;

ALTER TABLE publications
ADD CONSTRAINT publications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Document versions
ALTER TABLE document_versions
DROP CONSTRAINT IF EXISTS document_versions_user_id_fkey;

ALTER TABLE document_versions
ADD CONSTRAINT document_versions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Applications (already has CASCADE, but let's ensure it)
ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_user_id_fkey;

ALTER TABLE applications
ADD CONSTRAINT applications_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- User documents (already has CASCADE, but let's ensure it)
ALTER TABLE user_documents
DROP CONSTRAINT IF EXISTS user_documents_user_id_fkey;

ALTER TABLE user_documents
ADD CONSTRAINT user_documents_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Optional tables (handle gracefully if they don't exist)
DO $$
BEGIN
  -- Custom sections
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_sections') THEN
    ALTER TABLE custom_sections DROP CONSTRAINT IF EXISTS custom_sections_user_id_fkey;
    ALTER TABLE custom_sections
    ADD CONSTRAINT custom_sections_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Custom section entries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_section_entries') THEN
    ALTER TABLE custom_section_entries DROP CONSTRAINT IF EXISTS custom_section_entries_user_id_fkey;
    ALTER TABLE custom_section_entries
    ADD CONSTRAINT custom_section_entries_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- User email aliases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_email_aliases') THEN
    ALTER TABLE user_email_aliases DROP CONSTRAINT IF EXISTS user_email_aliases_user_id_fkey;
    ALTER TABLE user_email_aliases
    ADD CONSTRAINT user_email_aliases_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- User notification preferences
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_notification_preferences') THEN
    ALTER TABLE user_notification_preferences DROP CONSTRAINT IF EXISTS user_notification_preferences_user_id_fkey;
    ALTER TABLE user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- Lifecycle email logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lifecycle_email_logs') THEN
    ALTER TABLE lifecycle_email_logs DROP CONSTRAINT IF EXISTS lifecycle_email_logs_user_id_fkey;
    ALTER TABLE lifecycle_email_logs
    ADD CONSTRAINT lifecycle_email_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- App events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_events') THEN
    ALTER TABLE app_events DROP CONSTRAINT IF EXISTS app_events_user_id_fkey;
    ALTER TABLE app_events
    ADD CONSTRAINT app_events_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

-- CASCADE constraints added successfully
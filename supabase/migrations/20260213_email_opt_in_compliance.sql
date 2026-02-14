-- Email Marketing Opt-In Compliance Fix
-- Changes default behavior from opt-out to opt-in (GDPR-compliant)
-- Run BEFORE launch to ensure no marketing emails sent without consent

-- Step 1: Set all existing null preferences to FALSE (opt-out existing users)
-- This ensures existing users won't suddenly receive marketing emails
UPDATE user_notification_preferences
SET
  onboarding_nudges_enabled = COALESCE(onboarding_nudges_enabled, FALSE),
  reactivation_emails_enabled = COALESCE(reactivation_emails_enabled, FALSE),
  job_alerts_enabled = COALESCE(job_alerts_enabled, FALSE)
WHERE
  onboarding_nudges_enabled IS NULL
  OR reactivation_emails_enabled IS NULL
  OR job_alerts_enabled IS NULL;

-- Step 2: Set column defaults to FALSE for all new users
ALTER TABLE user_notification_preferences
  ALTER COLUMN onboarding_nudges_enabled SET DEFAULT FALSE,
  ALTER COLUMN reactivation_emails_enabled SET DEFAULT FALSE,
  ALTER COLUMN job_alerts_enabled SET DEFAULT FALSE;

-- Step 3: Add NOT NULL constraint (optional - ensures explicit choice)
-- Uncomment if you want to require explicit preference settings
-- ALTER TABLE user_notification_preferences
--   ALTER COLUMN onboarding_nudges_enabled SET NOT NULL,
--   ALTER COLUMN reactivation_emails_enabled SET NOT NULL,
--   ALTER COLUMN job_alerts_enabled SET NOT NULL;

-- Step 4: Create function to initialize preferences for new users
CREATE OR REPLACE FUNCTION initialize_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (
    user_id,
    onboarding_nudges_enabled,
    reactivation_emails_enabled,
    job_alerts_enabled
  ) VALUES (
    NEW.user_id,
    FALSE,  -- Opt-out by default (GDPR-compliant)
    FALSE,
    FALSE
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger to auto-initialize preferences on profile creation
DROP TRIGGER IF EXISTS on_profile_created_init_preferences ON profiles;
CREATE TRIGGER on_profile_created_init_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_notification_preferences();

-- Verification query (run after migration):
-- SELECT
--   COUNT(*) as total_users,
--   COUNT(*) FILTER (WHERE onboarding_nudges_enabled = TRUE) as onboarding_opted_in,
--   COUNT(*) FILTER (WHERE reactivation_emails_enabled = TRUE) as reactivation_opted_in,
--   COUNT(*) FILTER (WHERE job_alerts_enabled = TRUE) as job_alerts_opted_in
-- FROM user_notification_preferences;

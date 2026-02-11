-- Add onboarding_completed flag to profiles table
-- This persists onboarding state in the database so it survives browser cache clears
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Backfill: mark existing users who have meaningful profile data as onboarded
UPDATE profiles SET onboarding_completed = TRUE WHERE vorname IS NOT NULL AND nachname IS NOT NULL;

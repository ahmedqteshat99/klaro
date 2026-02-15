-- Add months field to professional experience
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS berufserfahrung_monate INTEGER DEFAULT 0 CHECK (berufserfahrung_monate >= 0 AND berufserfahrung_monate < 12);

COMMENT ON COLUMN profiles.berufserfahrung_monate IS 'Months of professional experience (0-11, to complement berufserfahrung_jahre)';

-- =============================================================
-- User Email Aliases + Smart Inbound Routing
-- =============================================================

-- 1. Add klaro_email column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS klaro_email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_klaro_email
  ON profiles(klaro_email)
  WHERE klaro_email IS NOT NULL;

-- 2. User email aliases registry (uniqueness + audit trail)
CREATE TABLE IF NOT EXISTS user_email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'klaro.tools',
  full_address TEXT GENERATED ALWAYS AS (alias || '@' || domain) STORED,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deactivated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_aliases_alias_domain
  ON user_email_aliases(alias, domain)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_user_email_aliases_user
  ON user_email_aliases(user_id);

CREATE INDEX IF NOT EXISTS idx_user_email_aliases_full_address
  ON user_email_aliases(full_address)
  WHERE is_active = TRUE;

ALTER TABLE user_email_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own aliases"
  ON user_email_aliases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage aliases"
  ON user_email_aliases FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view all aliases"
  ON user_email_aliases FOR SELECT
  USING (public.is_admin());

-- 3. Modify application_messages to support unlinked messages
ALTER TABLE application_messages
  ALTER COLUMN application_id DROP NOT NULL;

ALTER TABLE application_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE application_messages
  ADD COLUMN IF NOT EXISTS match_confidence TEXT;

ALTER TABLE application_messages
  ADD COLUMN IF NOT EXISTS match_signals JSONB;

-- Backfill user_id for existing messages
UPDATE application_messages am
SET user_id = a.user_id
FROM applications a
WHERE am.application_id = a.id
  AND am.user_id IS NULL;

-- Index for user-scoped unlinked messages
CREATE INDEX IF NOT EXISTS idx_application_messages_user_unlinked
  ON application_messages(user_id, created_at DESC)
  WHERE application_id IS NULL;

-- Index for message_id lookups (smart routing header match)
CREATE INDEX IF NOT EXISTS idx_application_messages_message_id
  ON application_messages(message_id)
  WHERE message_id IS NOT NULL;

-- Index for provider_message_id lookups
CREATE INDEX IF NOT EXISTS idx_application_messages_provider_message_id
  ON application_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- 4. Update RLS policies for application_messages to support unlinked messages
DROP POLICY IF EXISTS "Users can view messages for own applications" ON application_messages;
DROP POLICY IF EXISTS "Users can update messages for own applications" ON application_messages;

CREATE POLICY "Users can view own messages"
  ON application_messages FOR SELECT
  USING (
    (user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages"
  ON application_messages FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM applications a
      WHERE a.id = application_id
        AND a.user_id = auth.uid()
    )
  );

-- 5. Function to provision a user alias with collision handling
CREATE OR REPLACE FUNCTION provision_user_alias(
  p_user_id UUID,
  p_vorname TEXT,
  p_nachname TEXT,
  p_domain TEXT DEFAULT 'klaro.tools'
) RETURNS TEXT AS $$
DECLARE
  v_base_alias TEXT;
  v_candidate TEXT;
  v_suffix INT := 0;
  v_full_address TEXT;
  v_existing TEXT;
BEGIN
  -- Check if user already has an active alias
  SELECT full_address INTO v_existing
  FROM user_email_aliases
  WHERE user_id = p_user_id AND domain = p_domain AND is_active = TRUE
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Sanitize: lowercase, replace non-alnum with dot, collapse dots
  v_base_alias := lower(
    regexp_replace(
      regexp_replace(
        trim(COALESCE(p_vorname, '')) || '.' || trim(COALESCE(p_nachname, '')),
        '[^a-z0-9.]+', '.', 'gi'
      ),
      '\.{2,}', '.', 'g'
    )
  );
  v_base_alias := trim(BOTH '.' FROM v_base_alias);

  -- Fallback if empty
  IF v_base_alias = '' OR v_base_alias = '.' THEN
    v_base_alias := 'user' || replace(p_user_id::text, '-', '');
    v_base_alias := left(v_base_alias, 16);
  END IF;

  v_base_alias := left(v_base_alias, 24);
  v_candidate := v_base_alias;

  -- Check for collision, append number if needed
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM user_email_aliases
      WHERE alias = v_candidate AND domain = p_domain AND is_active = TRUE
    ) THEN
      EXIT;
    END IF;
    v_suffix := v_suffix + 1;
    v_candidate := v_base_alias || v_suffix::text;
  END LOOP;

  -- Insert the alias
  INSERT INTO user_email_aliases (user_id, alias, domain)
  VALUES (p_user_id, v_candidate, p_domain);

  v_full_address := v_candidate || '@' || p_domain;

  -- Update the profile
  UPDATE profiles
  SET klaro_email = v_full_address
  WHERE user_id = p_user_id;

  RETURN v_full_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

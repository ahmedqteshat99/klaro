-- Lifecycle campaigns: notification preferences + delivery logs

-- ===============================
-- User notification preferences
-- ===============================
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_nudges_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reactivation_emails_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  job_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_onboarding_nudge_at TIMESTAMPTZ,
  last_reactivation_email_at TIMESTAMPTZ,
  last_job_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_updated_at
  ON user_notification_preferences(updated_at DESC);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON user_notification_preferences;
DROP POLICY IF EXISTS "Admins can view all notification preferences" ON user_notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON user_notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all notification preferences"
  ON user_notification_preferences FOR SELECT
  USING (public.is_admin());

DROP TRIGGER IF EXISTS update_user_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing users
INSERT INTO user_notification_preferences (user_id)
SELECT p.user_id
FROM profiles p
JOIN auth.users u ON u.id = p.user_id
ON CONFLICT (user_id) DO NOTHING;

-- Keep preferences in sync for future users.
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_notification_preferences();

-- ===============================
-- Lifecycle email logs
-- ===============================
CREATE TABLE IF NOT EXISTS lifecycle_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('onboarding_nudge', 'reactivation', 'daily_job_alert')),
  dedupe_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  provider_message_id TEXT,
  error_message TEXT,
  meta JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_type, user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_email_logs_campaign_sent
  ON lifecycle_email_logs(campaign_type, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_email_logs_status_sent
  ON lifecycle_email_logs(status, sent_at DESC);

ALTER TABLE lifecycle_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lifecycle logs" ON lifecycle_email_logs;
DROP POLICY IF EXISTS "Admins can view all lifecycle logs" ON lifecycle_email_logs;
DROP POLICY IF EXISTS "Service role can insert lifecycle logs" ON lifecycle_email_logs;
DROP POLICY IF EXISTS "Service role can update lifecycle logs" ON lifecycle_email_logs;

CREATE POLICY "Users can view own lifecycle logs"
  ON lifecycle_email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lifecycle logs"
  ON lifecycle_email_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Service role can insert lifecycle logs"
  ON lifecycle_email_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update lifecycle logs"
  ON lifecycle_email_logs FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP TRIGGER IF EXISTS update_lifecycle_email_logs_updated_at ON lifecycle_email_logs;
CREATE TRIGGER update_lifecycle_email_logs_updated_at
  BEFORE UPDATE ON lifecycle_email_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

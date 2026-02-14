-- Admin Audit Logging System
-- Tracks admin access to sensitive user data for GDPR Art. 5(2) accountability

-- Step 1: Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'view_profile', 'view_documents', 'view_applications', 'view_messages', etc.
  target_user_id UUID, -- User whose data was accessed
  target_table TEXT, -- Table that was queried
  target_record_id UUID, -- Specific record ID (if applicable)
  query_details JSONB, -- Additional context (filters, search terms, etc.)
  ip_address INET, -- IP address of admin
  user_agent TEXT, -- Browser/client info
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_admin_audit_admin_user ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_target_user ON admin_audit_log(target_user_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);

-- Enable RLS
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Step 2: RLS Policies

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'ADMIN'
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
  ON admin_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert their own audit logs
CREATE POLICY "Admins can insert own audit logs"
  ON admin_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (admin_user_id = auth.uid());

-- Step 3: Helper function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_target_table TEXT DEFAULT NULL,
  p_target_record_id UUID DEFAULT NULL,
  p_query_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT role = 'ADMIN' INTO v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Only admins can create audit logs';
  END IF;

  -- Insert audit log
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    target_user_id,
    target_table,
    target_record_id,
    query_details
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_user_id,
    p_target_table,
    p_target_record_id,
    p_query_details
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Step 4: Create triggers for automatic logging of admin data access

-- Trigger function for profile views
CREATE OR REPLACE FUNCTION audit_admin_profile_access()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_is_own_profile BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT role = 'ADMIN' INTO v_is_admin
  FROM profiles
  WHERE user_id = auth.uid();

  -- Check if viewing own profile
  v_is_own_profile := (NEW.user_id = auth.uid());

  -- Log if admin is viewing another user's profile
  IF v_is_admin AND NOT v_is_own_profile THEN
    INSERT INTO admin_audit_log (
      admin_user_id,
      action,
      target_user_id,
      target_table,
      target_record_id
    ) VALUES (
      auth.uid(),
      'view_profile',
      NEW.user_id,
      'profiles',
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Triggers on SELECT are not supported in PostgreSQL
-- Instead, we'll rely on application-level logging via the log_admin_action function
-- Or use pg_stat_statements extension for query-level auditing (requires superuser)

-- Step 5: Create views for common audit queries

-- Recent admin activity view
CREATE OR REPLACE VIEW admin_activity_summary AS
SELECT
  aal.admin_user_id,
  p.vorname || ' ' || p.nachname AS admin_name,
  p.email AS admin_email,
  aal.action,
  COUNT(*) AS action_count,
  MAX(aal.created_at) AS last_action_at
FROM admin_audit_log aal
LEFT JOIN profiles p ON p.user_id = aal.admin_user_id
WHERE aal.created_at > NOW() - INTERVAL '30 days'
GROUP BY aal.admin_user_id, p.vorname, p.nachname, p.email, aal.action
ORDER BY last_action_at DESC;

-- User data access log view
CREATE OR REPLACE VIEW user_data_access_log AS
SELECT
  aal.target_user_id,
  tp.vorname || ' ' || tp.nachname AS target_user_name,
  tp.email AS target_user_email,
  aal.admin_user_id,
  ap.vorname || ' ' || ap.nachname AS admin_name,
  aal.action,
  aal.target_table,
  aal.created_at
FROM admin_audit_log aal
LEFT JOIN profiles tp ON tp.user_id = aal.target_user_id
LEFT JOIN profiles ap ON ap.user_id = aal.admin_user_id
WHERE aal.target_user_id IS NOT NULL
ORDER BY aal.created_at DESC;

-- Grant select on views to admins
GRANT SELECT ON admin_activity_summary TO authenticated;
GRANT SELECT ON user_data_access_log TO authenticated;

-- Step 6: Retention policy - delete audit logs older than 2 years
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM admin_audit_log
  WHERE created_at < NOW() - INTERVAL '2 years';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO service_role;

COMMENT ON TABLE admin_audit_log IS 'Tracks admin access to user data for GDPR accountability';
COMMENT ON FUNCTION log_admin_action IS 'Helper function for application-level admin audit logging';
COMMENT ON VIEW admin_activity_summary IS 'Summary of admin actions in last 30 days';
COMMENT ON VIEW user_data_access_log IS 'Log of which admins accessed which user data';

-- Rate Limiting System for Expensive Operations
-- Prevents abuse of AI generation and job extraction endpoints

-- Create rate_limit_log table to track API usage
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL, -- 'generate_cv', 'generate_anschreiben', 'extract_job'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for fast lookups
  CONSTRAINT rate_limit_log_user_endpoint_time_idx
    UNIQUE (user_id, endpoint, created_at)
);

-- Create index for efficient rate limit checks
CREATE INDEX idx_rate_limit_user_endpoint_time
  ON rate_limit_log(user_id, endpoint, created_at DESC);

-- Enable RLS
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rate limit logs
CREATE POLICY "Users can view own rate limits"
  ON rate_limit_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert rate limit logs
CREATE POLICY "System can insert rate limits"
  ON rate_limit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to check rate limit before processing
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_count INTEGER;
BEGIN
  -- Count requests in the time window
  SELECT COUNT(*)
  INTO request_count
  FROM rate_limit_log
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Return true if under limit, false if exceeded
  RETURN request_count < p_max_requests;
END;
$$;

-- Function to log rate limit request
CREATE OR REPLACE FUNCTION log_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO rate_limit_log (user_id, endpoint, created_at)
  VALUES (p_user_id, p_endpoint, NOW())
  ON CONFLICT (user_id, endpoint, created_at) DO NOTHING;
END;
$$;

-- Cleanup old rate limit logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION log_rate_limit(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_rate_limits() TO service_role;

-- Create scheduled job to cleanup old logs (runs daily at 3 AM)
-- Note: This requires pg_cron extension
-- SELECT cron.schedule(
--   'cleanup-rate-limits',
--   '0 3 * * *',
--   $$SELECT cleanup_old_rate_limits();$$
-- );

-- Rate Limit Configuration (as comments for reference):
-- generate_cv: 10 requests per hour
-- generate_anschreiben: 10 requests per hour
-- extract_job: 20 requests per hour
-- parse_cv: 5 requests per hour

COMMENT ON TABLE rate_limit_log IS 'Tracks API usage for rate limiting expensive operations (GDPR Security)';
COMMENT ON FUNCTION check_rate_limit IS 'Checks if user is within rate limit for endpoint';
COMMENT ON FUNCTION log_rate_limit IS 'Logs API request for rate limiting';
COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Removes rate limit logs older than 7 days';

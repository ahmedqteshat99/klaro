-- Admin panel data model + RLS policies for Klaro

-- 1) Extend profiles with role + last_seen_at
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER',
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 2) Create app_events table (privacy-friendly analytics)
CREATE TABLE IF NOT EXISTS app_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Helper: admin check based on profiles.role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

-- 4) Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_events ENABLE ROW LEVEL SECURITY;

-- 5) Profiles policies (own read/update + admin read-all)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

-- 6) app_events policies
DROP POLICY IF EXISTS "Admins can view all events" ON app_events;
DROP POLICY IF EXISTS "Users can insert own events" ON app_events;

CREATE POLICY "Admins can view all events" ON app_events
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Users can insert own events" ON app_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7) document_versions admin read policy (for admin metrics)
DROP POLICY IF EXISTS "Admins can view all documents" ON document_versions;
CREATE POLICY "Admins can view all documents" ON document_versions
  FOR SELECT USING (public.is_admin());

-- 8) Indexes
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON app_events(created_at);
CREATE INDEX IF NOT EXISTS idx_app_events_type_created_at ON app_events(type, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at ON profiles(last_seen_at);

-- Security fixes: prevent role escalation, remove legacy admin system, unify policies

-- 1) Normalize roles and enforce constraint
UPDATE profiles
SET role = 'USER'
WHERE role IS NULL OR role NOT IN ('USER', 'ADMIN');

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('USER', 'ADMIN'));

-- 2) Drop legacy admin policies (based on old is_admin(uid))
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

DROP POLICY IF EXISTS "Admins can view all work experiences" ON work_experiences;
DROP POLICY IF EXISTS "Admins can view all education" ON education_entries;
DROP POLICY IF EXISTS "Admins can view all practical experiences" ON practical_experiences;
DROP POLICY IF EXISTS "Admins can view all certifications" ON certifications;
DROP POLICY IF EXISTS "Admins can view all publications" ON publications;
DROP POLICY IF EXISTS "Admins can view all documents" ON document_versions;
DROP POLICY IF EXISTS "Admins can manage all share requests" ON candidate_share_requests;

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
    DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
  END IF;
END
$$;

-- 3) Recreate admin policies using public.is_admin()
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can view all work experiences" ON work_experiences
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all education" ON education_entries
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all practical experiences" ON practical_experiences
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all certifications" ON certifications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all publications" ON publications
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can view all documents" ON document_versions
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage all share requests" ON candidate_share_requests
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4) Prevent role escalation by regular users
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id AND role = 'USER');

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = 'USER');

-- 5) Remove legacy admin system
DROP FUNCTION IF EXISTS is_admin(uuid);
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP TABLE IF EXISTS user_roles;
  END IF;
END
$$;

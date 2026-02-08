BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(7);

-- Test users
CREATE TEMP TABLE test_ids (label text PRIMARY KEY, id uuid);
INSERT INTO test_ids (label, id)
VALUES ('user1', gen_random_uuid()), ('user2', gen_random_uuid());

-- Seed auth users
INSERT INTO auth.users (id, email)
SELECT id, label || '@example.com'
FROM test_ids;

-- Seed profiles
INSERT INTO profiles (user_id, vorname, nachname, role)
SELECT id, 'User', label, 'USER'
FROM test_ids
ON CONFLICT (user_id) DO UPDATE
SET vorname = EXCLUDED.vorname,
    nachname = EXCLUDED.nachname,
    role = 'USER';

-- Seed data
INSERT INTO work_experiences (user_id, klinik)
VALUES ((SELECT id FROM test_ids WHERE label = 'user1'), 'Klinik A');

INSERT INTO document_versions (user_id, name, typ, html_content)
VALUES ((SELECT id FROM test_ids WHERE label = 'user1'), 'Lebenslauf v1', 'CV', '<p>Test</p>');

INSERT INTO custom_sections (user_id, section_name)
VALUES
  ((SELECT id FROM test_ids WHERE label = 'user1'), 'Section A'),
  ((SELECT id FROM test_ids WHERE label = 'user2'), 'Section B');

INSERT INTO custom_section_entries (section_id, user_id, title)
VALUES (
  (SELECT id FROM custom_sections WHERE user_id = (SELECT id FROM test_ids WHERE label = 'user1') LIMIT 1),
  (SELECT id FROM test_ids WHERE label = 'user1'),
  'Entry A'
);

-- Cache ids before switching roles
SELECT set_config('app.user1', (SELECT id::text FROM test_ids WHERE label = 'user1'), true);
SELECT set_config('app.user2', (SELECT id::text FROM test_ids WHERE label = 'user2'), true);
SELECT set_config(
  'app.user2_section',
  (SELECT id::text FROM custom_sections WHERE user_id = (SELECT id FROM test_ids WHERE label = 'user2') LIMIT 1),
  true
);

-- Seed admin-only fields as superuser (temporarily disable trigger)
ALTER TABLE profiles DISABLE TRIGGER prevent_profile_admin_fields_update;
UPDATE profiles
SET admin_notes = 'admin-only'
WHERE user_id = (SELECT id FROM test_ids WHERE label = 'user1');
ALTER TABLE profiles ENABLE TRIGGER prevent_profile_admin_fields_update;

-- Switch to authenticated user1 (RLS enforced)
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', current_setting('app.user1'), true);

-- Helper: attempt ownership transfer on work_experiences
CREATE OR REPLACE FUNCTION pg_temp.try_transfer_work(u2 uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE work_experiences
  SET user_id = u2
  WHERE user_id = current_setting('app.user1')::uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

SELECT is(
  pg_temp.try_transfer_work(current_setting('app.user2')::uuid),
  false,
  'work_experiences ownership transfer blocked'
);

-- Helper: attempt ownership transfer on document_versions
CREATE OR REPLACE FUNCTION pg_temp.try_transfer_docs(u2 uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE document_versions
  SET user_id = u2
  WHERE user_id = current_setting('app.user1')::uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

SELECT is(
  pg_temp.try_transfer_docs(current_setting('app.user2')::uuid),
  false,
  'document_versions ownership transfer blocked'
);

-- Helper: attempt ownership transfer on custom_sections
CREATE OR REPLACE FUNCTION pg_temp.try_transfer_custom_section(u2 uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE custom_sections
  SET user_id = u2
  WHERE user_id = current_setting('app.user1')::uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

SELECT is(
  pg_temp.try_transfer_custom_section(current_setting('app.user2')::uuid),
  false,
  'custom_sections ownership transfer blocked'
);

-- Helper: attempt moving entry to a section not owned by the user
CREATE OR REPLACE FUNCTION pg_temp.try_move_entry_to_other_section(u2_section uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE custom_section_entries
  SET section_id = u2_section
  WHERE user_id = current_setting('app.user1')::uuid;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count > 0;
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

SELECT is(
  pg_temp.try_move_entry_to_other_section(
    current_setting('app.user2_section')::uuid
  ),
  false,
  'custom_section_entries cannot move to section not owned'
);

-- Admin-only fields should not change for non-admin
UPDATE profiles
SET admin_notes = 'hacked'
WHERE user_id = current_setting('app.user1')::uuid;

SELECT is(
  (SELECT admin_notes FROM profiles WHERE user_id = current_setting('app.user1')::uuid),
  'admin-only',
  'admin_notes unchanged for non-admin'
);

-- Role escalation should be blocked
CREATE OR REPLACE FUNCTION pg_temp.try_escalate_role()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  before_role text;
  after_role text;
BEGIN
  SELECT role INTO before_role
  FROM profiles
  WHERE user_id = current_setting('app.user1')::uuid;

  UPDATE profiles
  SET role = 'ADMIN'
  WHERE user_id = current_setting('app.user1')::uuid;

  SELECT role INTO after_role
  FROM profiles
  WHERE user_id = current_setting('app.user1')::uuid;

  RETURN after_role = 'ADMIN';
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;

SELECT is(
  pg_temp.try_escalate_role(),
  false,
  'role escalation blocked'
);

SELECT is(
  (SELECT role FROM profiles WHERE user_id = current_setting('app.user1')::uuid),
  'USER',
  'role remains USER'
);

SELECT * FROM finish();
ROLLBACK;

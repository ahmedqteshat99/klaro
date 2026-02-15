-- Diagnostic: Check all foreign key constraints on auth.users
-- Run this in Supabase SQL Editor to find what's blocking user deletion

SELECT
  conrelid::regclass AS "Table with FK",
  conname AS "Constraint Name",
  pg_get_constraintdef(oid) AS "Constraint Definition"
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass
AND contype = 'f'
ORDER BY conrelid::regclass::text;

-- Check if delete function exists and is accessible
SELECT
  routine_name,
  routine_type,
  security_type,
  is_deterministic
FROM information_schema.routines
WHERE routine_name = 'delete_user_account'
  AND routine_schema = 'public';

-- Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_deleted_trigger';

-- Test deletion for a specific user (REPLACE 'user-id-here' with actual ID)
-- DO NOT RUN THIS unless you want to test deletion!
-- SELECT delete_user_account('user-id-here'::uuid);

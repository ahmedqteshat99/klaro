-- ============================================================
-- COMPLETE FIX: User Deletion
-- Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ************************************************************
-- STEP 1: DROP THE BLOCKING TRIGGER
-- This trigger calls delete_user_account() BEFORE delete.
-- If that function errors, it blocks the entire deletion.
-- With CASCADE constraints, this trigger is not needed.
-- ************************************************************
DROP TRIGGER IF EXISTS on_auth_user_deleted_trigger ON auth.users;


-- ************************************************************
-- STEP 2: FIND ALL FOREIGN KEYS POINTING TO auth.users
-- This dynamically finds EVERY constraint, regardless of name
-- ************************************************************

-- 2a: Clean orphaned data for every table that has a FK to auth.users
DO $$
DECLARE
  r RECORD;
  col_name TEXT;
  is_nullable BOOLEAN;
BEGIN
  FOR r IN
    SELECT
      conrelid::regclass::text AS tbl,
      conname AS cname,
      a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
  LOOP
    -- Check if the column is nullable
    SELECT NOT a.attnotnull INTO is_nullable
    FROM pg_attribute a
    JOIN pg_class cl ON cl.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public'
      AND cl.relname = split_part(r.tbl, '.', CASE WHEN r.tbl LIKE '%.%' THEN 2 ELSE 1 END)
      AND a.attname = r.col;

    IF is_nullable THEN
      EXECUTE format(
        'UPDATE %s SET %I = NULL WHERE %I IS NOT NULL AND %I NOT IN (SELECT id FROM auth.users)',
        r.tbl, r.col, r.col, r.col
      );
      RAISE NOTICE 'SET NULL orphaned rows in %.%', r.tbl, r.col;
    ELSE
      EXECUTE format(
        'DELETE FROM %s WHERE %I NOT IN (SELECT id FROM auth.users)',
        r.tbl, r.col
      );
      RAISE NOTICE 'DELETED orphaned rows from %.%', r.tbl, r.col;
    END IF;
  END LOOP;
END $$;


-- ************************************************************
-- STEP 3: DYNAMICALLY FIX ALL CONSTRAINTS
-- Drops each FK and recreates with CASCADE or SET NULL
-- ************************************************************
DO $$
DECLARE
  r RECORD;
  col_nullable BOOLEAN;
BEGIN
  FOR r IN
    SELECT
      conrelid::regclass::text AS tbl,
      conname AS cname,
      a.attname AS col,
      NOT a.attnotnull AS is_nullable,
      pg_get_constraintdef(c.oid) AS cdef
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.confrelid = 'auth.users'::regclass
      AND c.contype = 'f'
  LOOP
    -- Skip if already has CASCADE or SET NULL
    IF r.cdef LIKE '%ON DELETE CASCADE%' OR r.cdef LIKE '%ON DELETE SET NULL%' THEN
      RAISE NOTICE 'SKIP % on % — already OK: %', r.cname, r.tbl, r.cdef;
      CONTINUE;
    END IF;

    -- Drop the old constraint
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.cname);

    -- Add with CASCADE (for NOT NULL cols) or SET NULL (for nullable cols)
    IF r.is_nullable THEN
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
        r.tbl, r.cname, r.col
      );
      RAISE NOTICE 'FIXED % on % → SET NULL', r.cname, r.tbl;
    ELSE
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
        r.tbl, r.cname, r.col
      );
      RAISE NOTICE 'FIXED % on % → CASCADE', r.cname, r.tbl;
    END IF;
  END LOOP;
END $$;


-- ************************************************************
-- STEP 4: VERIFY — show final state
-- Every row should say ON DELETE CASCADE or ON DELETE SET NULL
-- ************************************************************
SELECT
  conrelid::regclass AS "table",
  conname AS "constraint",
  pg_get_constraintdef(oid) AS "definition"
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass
  AND contype = 'f'
ORDER BY conrelid::regclass::text;

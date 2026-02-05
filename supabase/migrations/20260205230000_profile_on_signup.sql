-- Create profiles automatically on auth.users signup + backfill missing profiles

-- 1) Function to insert profile from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    email,
    vorname,
    nachname,
    dsgvo_einwilligung,
    dsgvo_einwilligung_datum,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'vorname', ''),
    COALESCE(NEW.raw_user_meta_data->>'nachname', ''),
    COALESCE((NEW.raw_user_meta_data->>'dsgvo_consent')::boolean, false),
    COALESCE((NEW.raw_user_meta_data->>'dsgvo_consent_date')::timestamptz, now()),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- 3) Backfill profiles for existing users
INSERT INTO public.profiles (
  user_id,
  email,
  vorname,
  nachname,
  dsgvo_einwilligung,
  dsgvo_einwilligung_datum,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'vorname', ''),
  COALESCE(u.raw_user_meta_data->>'nachname', ''),
  COALESCE((u.raw_user_meta_data->>'dsgvo_consent')::boolean, false),
  COALESCE((u.raw_user_meta_data->>'dsgvo_consent_date')::timestamptz, now()),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

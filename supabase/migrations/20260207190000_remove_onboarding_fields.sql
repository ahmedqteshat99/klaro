-- Remove onboarding fields and restore original signup profile handler

ALTER TABLE profiles
  DROP COLUMN IF EXISTS onboarding_completed,
  DROP COLUMN IF EXISTS onboarding_step,
  DROP COLUMN IF EXISTS onboarding_updated_at;

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

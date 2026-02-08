-- Onboarding fields for guided setup

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT NOT NULL DEFAULT 'complete',
  ADD COLUMN IF NOT EXISTS onboarding_updated_at TIMESTAMPTZ;

-- Ensure new signups start onboarding
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
    onboarding_completed,
    onboarding_step,
    onboarding_updated_at,
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
    false,
    'basics',
    now(),
    now(),
    now()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

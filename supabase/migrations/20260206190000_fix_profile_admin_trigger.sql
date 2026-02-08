-- Fix profile admin field protection trigger for schemas without role/admin_notes

CREATE OR REPLACE FUNCTION public.prevent_profile_admin_fields_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF to_jsonb(NEW) ? 'role' THEN
      NEW.role := OLD.role;
    END IF;
    IF to_jsonb(NEW) ? 'admin_notes' THEN
      NEW.admin_notes := OLD.admin_notes;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

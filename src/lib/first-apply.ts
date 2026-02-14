import type { Tables } from "@/integrations/supabase/types";

type ProfileRow = Tables<"profiles"> | null | undefined;

export const REQUIRED_FIRST_APPLY_FIELDS = ["vorname", "nachname", "email"] as const;

const FIELD_LABELS: Record<(typeof REQUIRED_FIRST_APPLY_FIELDS)[number], string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  email: "E-Mail",
};

const normalize = (value: string | null | undefined) => value?.trim() ?? "";

export const getMissingFirstApplyFields = (
  profile: ProfileRow,
  fallbackEmail?: string | null
): string[] => {
  const values = {
    vorname: normalize(profile?.vorname),
    nachname: normalize(profile?.nachname),
    email: normalize(profile?.email || fallbackEmail || ""),
  };

  return REQUIRED_FIRST_APPLY_FIELDS.filter((field) => values[field].length === 0).map(
    (field) => FIELD_LABELS[field]
  );
};

export const hasMinimumFirstApplyProfile = (
  profile: ProfileRow,
  fallbackEmail?: string | null
) => getMissingFirstApplyFields(profile, fallbackEmail).length === 0;


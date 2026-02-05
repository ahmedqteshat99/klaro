import type {
  CvImportProfile,
  CvImportWorkExperience,
  CvImportEducationEntry,
  CvImportPracticalExperience,
  CvImportCertification,
  CvImportPublication,
  CvImportData,
} from "@/lib/api/cv-import";

// Extended types with review-specific fields
export interface CvReviewWorkExperience extends CvImportWorkExperience {
  _tempId: string;
  _enabled: boolean;
}

export interface CvReviewEducationEntry extends CvImportEducationEntry {
  _tempId: string;
  _enabled: boolean;
}

export interface CvReviewPracticalExperience extends CvImportPracticalExperience {
  _tempId: string;
  _enabled: boolean;
}

export interface CvReviewCertification extends CvImportCertification {
  _tempId: string;
  _enabled: boolean;
}

export interface CvReviewPublication extends CvImportPublication {
  _tempId: string;
  _enabled: boolean;
}

export interface ProfileFieldState {
  value: unknown;
  enabled: boolean;
}

export interface CvReviewProfileState {
  vorname: ProfileFieldState;
  nachname: ProfileFieldState;
  email: ProfileFieldState;
  telefon: ProfileFieldState;
  stadt: ProfileFieldState;
  geburtsdatum: ProfileFieldState;
  staatsangehoerigkeit: ProfileFieldState;
  familienstand: ProfileFieldState;
  fachrichtung: ProfileFieldState;
  approbationsstatus: ProfileFieldState;
  deutschniveau: ProfileFieldState;
  berufserfahrung_jahre: ProfileFieldState;
  medizinische_kenntnisse: ProfileFieldState;
  edv_kenntnisse: ProfileFieldState;
  sprachkenntnisse: ProfileFieldState;
  interessen: ProfileFieldState;
}

export interface UnmatchedDataItem {
  _tempId: string;
  _enabled: boolean;
  rawText: string;
  suggestedCategory: string | null;
  assignedSection: string | null; // section name if creating new section
}

export interface CustomSectionToCreate {
  sectionName: string;
  existingSectionId?: string | null; // If set, add to existing section instead of creating new
  entries: {
    title: string;
    description?: string | null;
  }[];
}

export interface CvReviewState {
  profile: CvReviewProfileState | null;
  workExperiences: CvReviewWorkExperience[];
  educationEntries: CvReviewEducationEntry[];
  practicalExperiences: CvReviewPracticalExperience[];
  certifications: CvReviewCertification[];
  publications: CvReviewPublication[];
  unmatchedData: UnmatchedDataItem[];
  customSectionsToCreate: CustomSectionToCreate[];
}

// Profile field keys for iteration
export const PROFILE_FIELD_KEYS: (keyof CvImportProfile)[] = [
  "vorname",
  "nachname",
  "email",
  "telefon",
  "stadt",
  "geburtsdatum",
  "staatsangehoerigkeit",
  "familienstand",
  "fachrichtung",
  "approbationsstatus",
  "deutschniveau",
  "berufserfahrung_jahre",
  "medizinische_kenntnisse",
  "edv_kenntnisse",
  "sprachkenntnisse",
  "interessen",
];

// German labels for profile fields
export const PROFILE_FIELD_LABELS: Record<keyof CvImportProfile, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  email: "E-Mail",
  telefon: "Telefon",
  stadt: "Stadt",
  geburtsdatum: "Geburtsdatum",
  staatsangehoerigkeit: "Staatsangehörigkeit",
  familienstand: "Familienstand",
  fachrichtung: "Fachrichtung",
  approbationsstatus: "Approbationsstatus",
  deutschniveau: "Deutschniveau",
  berufserfahrung_jahre: "Berufserfahrung (Jahre)",
  medizinische_kenntnisse: "Medizinische Kenntnisse",
  edv_kenntnisse: "EDV-Kenntnisse",
  sprachkenntnisse: "Sprachkenntnisse",
  interessen: "Interessen",
  cv_text: "CV-Text",
};

// Helper function to generate unique IDs
const generateTempId = (prefix: string, index: number): string => {
  return `${prefix}-${Date.now()}-${index}`;
};

// Initialize review state from import data
export function initializeReviewState(data: CvImportData): CvReviewState {
  const profile = data.profile;

  const profileState: CvReviewProfileState | null = profile ? {
    vorname: { value: profile.vorname ?? null, enabled: !!profile.vorname },
    nachname: { value: profile.nachname ?? null, enabled: !!profile.nachname },
    email: { value: profile.email ?? null, enabled: !!profile.email },
    telefon: { value: profile.telefon ?? null, enabled: !!profile.telefon },
    stadt: { value: profile.stadt ?? null, enabled: !!profile.stadt },
    geburtsdatum: { value: profile.geburtsdatum ?? null, enabled: !!profile.geburtsdatum },
    staatsangehoerigkeit: { value: profile.staatsangehoerigkeit ?? null, enabled: !!profile.staatsangehoerigkeit },
    familienstand: { value: profile.familienstand ?? null, enabled: !!profile.familienstand },
    fachrichtung: { value: profile.fachrichtung ?? null, enabled: !!profile.fachrichtung },
    approbationsstatus: { value: profile.approbationsstatus ?? null, enabled: !!profile.approbationsstatus },
    deutschniveau: { value: profile.deutschniveau ?? null, enabled: !!profile.deutschniveau },
    berufserfahrung_jahre: { value: profile.berufserfahrung_jahre ?? null, enabled: profile.berufserfahrung_jahre != null },
    medizinische_kenntnisse: { value: profile.medizinische_kenntnisse ?? [], enabled: (profile.medizinische_kenntnisse?.length ?? 0) > 0 },
    edv_kenntnisse: { value: profile.edv_kenntnisse ?? [], enabled: (profile.edv_kenntnisse?.length ?? 0) > 0 },
    sprachkenntnisse: { value: profile.sprachkenntnisse ?? [], enabled: (profile.sprachkenntnisse?.length ?? 0) > 0 },
    interessen: { value: profile.interessen ?? null, enabled: !!profile.interessen },
  } : null;

  return {
    profile: profileState,
    workExperiences: (data.workExperiences || []).map((item, i) => ({
      ...item,
      _tempId: generateTempId("work", i),
      _enabled: true,
    })),
    educationEntries: (data.educationEntries || []).map((item, i) => ({
      ...item,
      _tempId: generateTempId("edu", i),
      _enabled: true,
    })),
    practicalExperiences: (data.practicalExperiences || []).map((item, i) => ({
      ...item,
      _tempId: generateTempId("prac", i),
      _enabled: true,
    })),
    certifications: (data.certifications || []).map((item, i) => ({
      ...item,
      _tempId: generateTempId("cert", i),
      _enabled: true,
    })),
    publications: (data.publications || []).map((item, i) => ({
      ...item,
      _tempId: generateTempId("pub", i),
      _enabled: true,
    })),
    unmatchedData: ((data as any).unmatchedData || []).map((text: string, i: number) => ({
      _tempId: generateTempId("unmatched", i),
      _enabled: false,
      rawText: text,
      suggestedCategory: null,
      assignedSection: null,
    })),
    customSectionsToCreate: [],
  };
}

// Filter enabled items and convert back to CvImportData
export function filterEnabledItems(state: CvReviewState): CvImportData {
  // Build profile from enabled fields
  let profile: CvImportProfile | null = null;
  if (state.profile) {
    const profileData: Partial<CvImportProfile> = {};
    const p = state.profile;

    if (p.vorname.enabled) profileData.vorname = p.vorname.value as string | null;
    if (p.nachname.enabled) profileData.nachname = p.nachname.value as string | null;
    if (p.email.enabled) profileData.email = p.email.value as string | null;
    if (p.telefon.enabled) profileData.telefon = p.telefon.value as string | null;
    if (p.stadt.enabled) profileData.stadt = p.stadt.value as string | null;
    if (p.geburtsdatum.enabled) profileData.geburtsdatum = p.geburtsdatum.value as string | null;
    if (p.staatsangehoerigkeit.enabled) profileData.staatsangehoerigkeit = p.staatsangehoerigkeit.value as string | null;
    if (p.familienstand.enabled) profileData.familienstand = p.familienstand.value as string | null;
    if (p.fachrichtung.enabled) profileData.fachrichtung = p.fachrichtung.value as string | null;
    if (p.approbationsstatus.enabled) profileData.approbationsstatus = p.approbationsstatus.value as string | null;
    if (p.deutschniveau.enabled) profileData.deutschniveau = p.deutschniveau.value as string | null;
    if (p.berufserfahrung_jahre.enabled) profileData.berufserfahrung_jahre = p.berufserfahrung_jahre.value as number | null;
    if (p.medizinische_kenntnisse.enabled) profileData.medizinische_kenntnisse = p.medizinische_kenntnisse.value as string[];
    if (p.edv_kenntnisse.enabled) profileData.edv_kenntnisse = p.edv_kenntnisse.value as string[];
    if (p.sprachkenntnisse.enabled) profileData.sprachkenntnisse = p.sprachkenntnisse.value as string[];
    if (p.interessen.enabled) profileData.interessen = p.interessen.value as string | null;

    if (Object.keys(profileData).length > 0) {
      profile = profileData as CvImportProfile;
    }
  }

  return {
    profile,
    workExperiences: state.workExperiences
      .filter(item => item._enabled)
      .map(({ _tempId, _enabled, ...rest }) => rest),
    educationEntries: state.educationEntries
      .filter(item => item._enabled)
      .map(({ _tempId, _enabled, ...rest }) => rest),
    practicalExperiences: state.practicalExperiences
      .filter(item => item._enabled)
      .map(({ _tempId, _enabled, ...rest }) => rest),
    certifications: state.certifications
      .filter(item => item._enabled)
      .map(({ _tempId, _enabled, ...rest }) => rest),
    publications: state.publications
      .filter(item => item._enabled)
      .map(({ _tempId, _enabled, ...rest }) => rest),
  };
}

// Check if any items are enabled
export function hasAnyEnabledItems(state: CvReviewState): boolean {
  // Check profile fields
  if (state.profile) {
    const hasEnabledProfileField = Object.values(state.profile).some(
      field => field.enabled && field.value != null &&
        (Array.isArray(field.value) ? field.value.length > 0 : true)
    );
    if (hasEnabledProfileField) return true;
  }

  return (
    state.workExperiences.some(i => i._enabled) ||
    state.educationEntries.some(i => i._enabled) ||
    state.practicalExperiences.some(i => i._enabled) ||
    state.certifications.some(i => i._enabled) ||
    state.publications.some(i => i._enabled) ||
    state.customSectionsToCreate.length > 0
  );
}

// Count enabled items
export function countEnabledItems(state: CvReviewState): number {
  let count = 0;

  if (state.profile) {
    count += Object.values(state.profile).filter(
      field => field.enabled && field.value != null &&
        (Array.isArray(field.value) ? field.value.length > 0 : true)
    ).length;
  }

  count += state.workExperiences.filter(i => i._enabled).length;
  count += state.educationEntries.filter(i => i._enabled).length;
  count += state.practicalExperiences.filter(i => i._enabled).length;
  count += state.certifications.filter(i => i._enabled).length;
  count += state.publications.filter(i => i._enabled).length;

  return count;
}

// Custom section types for database
export interface CustomSection {
  id: string;
  user_id: string;
  section_name: string;
  section_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomSectionEntry {
  id: string;
  section_id: string;
  user_id: string;
  title: string;
  description: string | null;
  datum: string | null;
  zeitraum_von: string | null;
  zeitraum_bis: string | null;
  created_at: string;
  updated_at: string;
}

import type {
  Profile,
  WorkExperience,
  EducationEntry,
  PracticalExperience,
  Certification,
  Publication,
  CustomSection,
  CustomSectionEntry
} from "@/hooks/useProfile";

interface ProfileData {
  profile: Profile | null;
  workExperiences: WorkExperience[];
  educationEntries: EducationEntry[];
  practicalExperiences: PracticalExperience[];
  certifications: Certification[];
  publications: Publication[];
  customSections: CustomSection[];
  customSectionEntries: CustomSectionEntry[];
}

/**
 * Checks if a CV is still fresh based on profile update timestamps.
 * A CV is considered fresh if it was created after the most recent profile update.
 *
 * @param cvCreatedAt - The timestamp when the CV was created
 * @param profileData - All profile-related data with updated_at timestamps
 * @returns true if CV is fresh, false if profile has been updated since CV creation
 */
export function isCvFresh(cvCreatedAt: Date, profileData: ProfileData): boolean {
  const timestamps = collectAllTimestamps(profileData);

  if (timestamps.length === 0) {
    return true; // No profile data, consider CV fresh
  }

  const mostRecentProfileUpdate = new Date(Math.max(...timestamps.map(d => d.getTime())));
  return cvCreatedAt >= mostRecentProfileUpdate;
}

/**
 * Collects all update timestamps from profile-related data.
 *
 * @param profileData - All profile-related data
 * @returns Array of Date objects for all non-null updated_at timestamps
 */
function collectAllTimestamps(profileData: ProfileData): Date[] {
  const {
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
    customSections,
    customSectionEntries
  } = profileData;

  return [
    profile?.updated_at ? new Date(profile.updated_at) : null,
    ...workExperiences.map(w => w.updated_at ? new Date(w.updated_at) : null),
    ...educationEntries.map(e => e.updated_at ? new Date(e.updated_at) : null),
    ...practicalExperiences.map(p => p.updated_at ? new Date(p.updated_at) : null),
    ...certifications.map(c => c.updated_at ? new Date(c.updated_at) : null),
    ...publications.map(p => p.updated_at ? new Date(p.updated_at) : null),
    ...customSections.map(s => s.updated_at ? new Date(s.updated_at) : null),
    ...customSectionEntries.map(e => e.updated_at ? new Date(e.updated_at) : null),
  ].filter((d): d is Date => d !== null);
}

/**
 * Gets the most recent update timestamp from all profile-related data.
 *
 * @param profileData - All profile-related data
 * @returns The most recent update Date, or null if no updates found
 */
export function getMostRecentProfileUpdate(profileData: ProfileData): Date | null {
  const timestamps = collectAllTimestamps(profileData);
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps.map(d => d.getTime())));
}

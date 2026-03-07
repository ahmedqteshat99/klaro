import { useMemo } from "react";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import type { Profile, WorkExperience, EducationEntry, PracticalExperience, Certification, Publication } from "@/hooks/useProfile";

interface ProfileCompletenessProps {
    profile: Profile | null;
    workExperiences: WorkExperience[];
    educationEntries: EducationEntry[];
    practicalExperiences: PracticalExperience[];
    certifications: Certification[];
    publications: Publication[];
}

interface SectionStatus {
    label: string;
    filled: boolean;
    partial: boolean;
}

const ProfileCompleteness = ({
    profile,
    workExperiences,
    educationEntries,
    practicalExperiences,
    certifications,
    publications,
}: ProfileCompletenessProps) => {
    const sections = useMemo<SectionStatus[]>(() => {
        const p = profile;
        return [
            {
                label: "Persönliche Daten",
                filled: !!(p?.vorname && p?.nachname && p?.email),
                partial: !!(p?.vorname || p?.nachname),
            },
            {
                label: "Berufliches Profil",
                filled: !!(p?.fachrichtung && p?.deutschniveau),
                partial: !!(p?.fachrichtung || p?.deutschniveau),
            },
            {
                label: "Berufserfahrung",
                filled: workExperiences.length > 0,
                partial: false,
            },
            {
                label: "Ausbildung",
                filled: educationEntries.length > 0,
                partial: false,
            },
            {
                label: "Praktische Erfahrung",
                filled: practicalExperiences.length > 0,
                partial: false,
            },
            {
                label: "Kenntnisse",
                filled: !!(p?.medizinische_kenntnisse && (p.medizinische_kenntnisse as string[]).length > 0),
                partial: false,
            },
            {
                label: "Sprachen",
                filled: !!(p?.sprachkenntnisse && (p.sprachkenntnisse as string[]).length > 0),
                partial: false,
            },
            {
                label: "Zertifikate",
                filled: certifications.length > 0,
                partial: false,
            },
        ];
    }, [profile, workExperiences, educationEntries, practicalExperiences, certifications, publications]);

    const filledCount = sections.filter((s) => s.filled).length;
    const percentage = Math.round((filledCount / sections.length) * 100);

    return (
        <div className="profile-completeness rounded-xl border bg-card p-4 sm:p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Profilvollständigkeit</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {percentage}%
                    </span>
                </div>
                <span className="text-xs text-muted-foreground">
                    {filledCount} von {sections.length} Bereichen
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                        width: `${percentage}%`,
                        background:
                            percentage === 100
                                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                                : percentage >= 60
                                    ? "linear-gradient(90deg, #3b82f6, #2563eb)"
                                    : "linear-gradient(90deg, #f59e0b, #d97706)",
                    }}
                />
            </div>

            {/* Section badges */}
            <div className="flex flex-wrap gap-2">
                {sections.map((section) => (
                    <div
                        key={section.label}
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors ${section.filled
                            ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                            : section.partial
                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                                : "bg-muted/50 text-muted-foreground border-border"
                            }`}
                    >
                        {section.filled ? (
                            <CheckCircle2 className="h-3 w-3" />
                        ) : section.partial ? (
                            <AlertCircle className="h-3 w-3" />
                        ) : (
                            <Circle className="h-3 w-3" />
                        )}
                        {section.label}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfileCompleteness;

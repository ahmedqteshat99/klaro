import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { readCvFile } from "@/lib/cv-file";
import { parseCvText, type CvImportData } from "@/lib/api/cv-import";
import { CvImportReviewModal } from "./CvImportReviewModal";
import type { CustomSectionToCreate } from "@/lib/types/cv-review";
import type {
  Profile,
  WorkExperience,
  EducationEntry,
  PracticalExperience,
  Certification,
  Publication,
  CustomSection,
} from "@/hooks/useProfile";

interface CvImportCardProps {
  profile: Profile | null;
  customSections?: CustomSection[]; // NEW: existing custom sections
  updateLocalProfile: (data: Partial<Profile>) => void;
  saveProfile: (data: Partial<Profile>) => Promise<void>;
  addWorkExperiencesLocal: (
    entries: Omit<WorkExperience, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => void;
  addWorkExperience: (
    data: Omit<WorkExperience, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;
  addEducationEntriesLocal: (
    entries: Omit<EducationEntry, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => void;
  addEducation: (
    data: Omit<EducationEntry, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;
  addPracticalExperiencesLocal: (
    entries: Omit<PracticalExperience, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => void;
  addPracticalExperience: (
    data: Omit<PracticalExperience, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;
  addCertificationsLocal: (
    entries: Omit<Certification, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => void;
  addCertification: (
    data: Omit<Certification, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;
  addPublicationsLocal: (
    entries: Omit<Publication, "id" | "user_id" | "created_at" | "updated_at">[]
  ) => void;
  addPublication: (
    data: Omit<Publication, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<void>;
  addCustomSection?: (sectionName: string) => Promise<CustomSection | null>;
  addCustomSectionEntry?: (
    sectionId: string,
    data: { title: string; description?: string | null }
  ) => Promise<void>;
  onImportComplete?: () => void;
}

const MAX_TEXT_LENGTH = 12000;
const MAX_PROFILE_TEXT = 20000;

const normalizeDate = (value?: string | null) => {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^(heute|present|current|aktuell)$/i.test(raw)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{2}\/\d{4}$/.test(raw)) {
    const [month, year] = raw.split("/");
    return `${year}-${month}-01`;
  }
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  return null;
};

const mergeUnique = (current: string[] | null | undefined, incoming: string[]) => {
  const base = Array.isArray(current) ? current : [];
  const merged = new Set<string>();
  base.forEach((item) => merged.add(item.trim()));
  incoming.forEach((item) => merged.add(item.trim()));
  return Array.from(merged).filter(Boolean);
};

const CvImportCard = ({
  profile,
  customSections = [],
  updateLocalProfile,
  saveProfile,
  addWorkExperiencesLocal,
  addWorkExperience,
  addEducationEntriesLocal,
  addEducation,
  addPracticalExperiencesLocal,
  addPracticalExperience,
  addCertificationsLocal,
  addCertification,
  addPublicationsLocal,
  addPublication,
  addCustomSection,
  addCustomSectionEntry,
  onImportComplete,
}: CvImportCardProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [parsedData, setParsedData] = useState<CvImportData | null>(null);
  const [parsedSourceText, setParsedSourceText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const applyProfileImport = (imported: CvImportData["profile"], sourceText: string) => {
    if (!imported) return;
    const updates: Partial<Profile> = {};

    const assignIfAllowed = (key: keyof Profile, value: unknown) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        const merged = overwrite ? value : mergeUnique(profile?.[key] as string[] | null, value);
        if (merged.length > 0) {
          (updates as any)[key] = merged;
        }
        return;
      }
      if (typeof value === "number") {
        if (overwrite || profile?.[key] == null) {
          (updates as any)[key] = value;
        }
        return;
      }
      if (typeof value === "string") {
        if (overwrite || !String(profile?.[key] || "").trim()) {
          (updates as any)[key] = value.trim();
        }
      }
    };

    Object.entries(imported).forEach(([key, value]) => {
      assignIfAllowed(key as keyof Profile, value);
    });

    if (sourceText.trim()) {
      assignIfAllowed("cv_text", sourceText.trim().slice(0, MAX_PROFILE_TEXT));
    }

    if (Object.keys(updates).length > 0) {
      updateLocalProfile(updates);
    }
  };

  const applyImport = async (
    data: CvImportData,
    sourceText: string,
    customSections: CustomSectionToCreate[]
  ) => {
    // Save profile data to database
    setSavingStatus("Profildaten werden gespeichert...");
    if (data.profile) {
      const profileUpdates: Partial<Profile> = {};

      const assignIfAllowed = (key: keyof Profile, value: unknown) => {
        if (value == null) return;
        if (Array.isArray(value)) {
          const merged = overwrite ? value : mergeUnique(profile?.[key] as string[] | null, value);
          if (merged.length > 0) {
            (profileUpdates as any)[key] = merged;
          }
          return;
        }
        if (typeof value === "number") {
          if (overwrite || profile?.[key] == null) {
            (profileUpdates as any)[key] = value;
          }
          return;
        }
        if (typeof value === "string") {
          if (overwrite || !String(profile?.[key] || "").trim()) {
            (profileUpdates as any)[key] = value.trim();
          }
        }
      };

      Object.entries(data.profile).forEach(([key, value]) => {
        assignIfAllowed(key as keyof Profile, value);
      });

      if (sourceText.trim()) {
        assignIfAllowed("cv_text", sourceText.trim().slice(0, MAX_PROFILE_TEXT));
      }

      if (Object.keys(profileUpdates).length > 0) {
        await saveProfile(profileUpdates);
      }
    }

    // Prepare all entries
    const workExperiences =
      data.workExperiences?.flatMap((entry) => {
        if (!entry?.klinik) return [];
        return [{
          klinik: entry.klinik.trim(),
          station: entry.station?.trim() || null,
          taetigkeiten: entry.taetigkeiten?.trim() || null,
          zeitraum_von: normalizeDate(entry.zeitraum_von),
          zeitraum_bis: normalizeDate(entry.zeitraum_bis),
        }];
      }) || [];

    const educationEntries =
      data.educationEntries?.flatMap((entry) => {
        if (!entry?.universitaet) return [];
        return [{
          universitaet: entry.universitaet.trim(),
          abschluss: entry.abschluss?.trim() || null,
          abschlussarbeit: entry.abschlussarbeit?.trim() || null,
          zeitraum_von: normalizeDate(entry.zeitraum_von),
          zeitraum_bis: normalizeDate(entry.zeitraum_bis),
        }];
      }) || [];

    const practicalExperiences =
      data.practicalExperiences?.flatMap((entry) => {
        if (!entry?.einrichtung) return [];
        return [{
          einrichtung: entry.einrichtung.trim(),
          fachbereich: entry.fachbereich?.trim() || null,
          beschreibung: entry.beschreibung?.trim() || null,
          typ: entry.typ?.trim() || null,
          zeitraum_von: normalizeDate(entry.zeitraum_von),
          zeitraum_bis: normalizeDate(entry.zeitraum_bis),
        }];
      }) || [];

    const certifications =
      data.certifications?.flatMap((entry) => {
        if (!entry?.name) return [];
        return [{
          name: entry.name.trim(),
          aussteller: entry.aussteller?.trim() || null,
          datum: normalizeDate(entry.datum),
        }];
      }) || [];

    const publications =
      data.publications?.flatMap((entry) => {
        if (!entry?.titel) return [];
        return [{
          titel: entry.titel.trim(),
          typ: entry.typ?.trim() || null,
          journal_ort: entry.journal_ort?.trim() || null,
          datum: normalizeDate(entry.datum),
          beschreibung: entry.beschreibung?.trim() || null,
        }];
      }) || [];

    // Save all entries directly to database (not just local state)
    if (workExperiences.length > 0) {
      setSavingStatus("Berufserfahrung wird gespeichert...");
      for (const entry of workExperiences) {
        await addWorkExperience(entry);
      }
    }
    if (educationEntries.length > 0) {
      setSavingStatus("Ausbildung wird gespeichert...");
      for (const entry of educationEntries) {
        await addEducation(entry);
      }
    }
    if (practicalExperiences.length > 0) {
      setSavingStatus("Praktische Erfahrungen werden gespeichert...");
      for (const entry of practicalExperiences) {
        await addPracticalExperience(entry);
      }
    }
    if (certifications.length > 0) {
      setSavingStatus("Zertifikate werden gespeichert...");
      for (const entry of certifications) {
        await addCertification(entry);
      }
    }
    if (publications.length > 0) {
      setSavingStatus("Publikationen werden gespeichert...");
      for (const entry of publications) {
        await addPublication(entry);
      }
    }

    // Create custom sections if functions are available
    if (addCustomSection && addCustomSectionEntry && customSections.length > 0) {
      setSavingStatus("Eigene Sektionen werden gespeichert...");
      for (const section of customSections) {
        if (section.existingSectionId) {
          // Add to existing section
          for (const entry of section.entries) {
            await addCustomSectionEntry(section.existingSectionId, entry);
          }
        } else {
          // Create new section
          const newSection = await addCustomSection(section.sectionName);
          if (newSection) {
            for (const entry of section.entries) {
              await addCustomSectionEntry(newSection.id, entry);
            }
          }
        }
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile && !rawText.trim()) {
      toast({
        title: "Keine Daten",
        description: "Bitte laden Sie eine Datei hoch oder fügen Sie Text ein.",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);
    try {
      let sourceText = rawText.trim();
      if (selectedFile) {
        sourceText = await readCvFile(selectedFile);
      }

      if (!sourceText.trim()) {
        throw new Error("Der Lebenslauf enthält keinen lesbaren Text.");
      }

      const trimmedText = sourceText.slice(0, MAX_TEXT_LENGTH);
      const { success, data, error } = await parseCvText(trimmedText);

      if (!success || !data) {
        throw new Error(error || "CV-Import fehlgeschlagen.");
      }

      // Open review modal instead of applying directly
      setParsedData(data);
      setParsedSourceText(trimmedText);
      setIsReviewModalOpen(true);
    } catch (error: any) {
      toast({
        title: "Import fehlgeschlagen",
        description: error.message || "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleReviewConfirm = async (
    filteredData: CvImportData,
    sourceText: string,
    customSections: CustomSectionToCreate[]
  ) => {
    // Close review modal and show saving dialog
    setIsReviewModalOpen(false);
    setIsSaving(true);
    setSavingStatus("Profildaten werden gespeichert...");

    try {
      await applyImport(filteredData, sourceText, customSections);
      setSavingStatus("Import abgeschlossen!");
      // Brief pause to show completion state
      await new Promise(resolve => setTimeout(resolve, 800));
    } finally {
      setIsSaving(false);
      setSavingStatus("");
    }

    setParsedData(null);
    setParsedSourceText("");
    resetInputs();

    toast({
      title: "Import abgeschlossen",
      description: "Alle Daten wurden automatisch gespeichert.",
    });

    // Notify parent component that import is complete (navigates to step 2)
    if (onImportComplete) {
      onImportComplete();
    }
  };

  const resetInputs = () => {
    setSelectedFile(null);
    setRawText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            CV importieren
          </CardTitle>
          <CardDescription>
            Importieren Sie Ihren bestehenden Lebenslauf (PDF/DOCX) und füllen Sie die Felder automatisch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cv-file">Datei hochladen (PDF oder DOCX)</Label>
            <Input
              id="cv-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Ausgewählt: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv-text">Oder Text einfügen</Label>
            <Textarea
              id="cv-text"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Lebenslauf-Text hier einfügen..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="overwrite-import"
              checked={overwrite}
              onCheckedChange={(value) => setOverwrite(Boolean(value))}
            />
            <Label htmlFor="overwrite-import">Bestehende Felder überschreiben</Label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleImport} disabled={isParsing}>
              {isParsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Import läuft…
                </>
              ) : (
                "CV importieren"
              )}
            </Button>
            <Button variant="outline" onClick={resetInputs} disabled={isParsing}>
              Zurücksetzen
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Nach dem Import können Sie die erkannten Daten überprüfen und bearbeiten, bevor sie übernommen werden.
          </p>
        </CardContent>
      </Card>

      {parsedData && (
        <CvImportReviewModal
          open={isReviewModalOpen}
          onOpenChange={setIsReviewModalOpen}
          importData={parsedData}
          sourceText={parsedSourceText}
          existingCustomSections={customSections}
          onConfirm={handleReviewConfirm}
        />
      )}

      <Dialog open={isSaving} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-4 py-6">
            {savingStatus === "Import abgeschlossen!" ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            )}
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">
                {savingStatus === "Import abgeschlossen!" ? "Fertig!" : "Daten werden gespeichert"}
              </h3>
              <p className="text-sm text-muted-foreground">{savingStatus}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CvImportCard;

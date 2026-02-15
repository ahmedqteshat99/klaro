import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Accordion } from "@/components/ui/accordion";
import { FileCheck } from "lucide-react";
import type { CvImportData } from "@/lib/api/cv-import";
import type { CvReviewState, CustomSectionToCreate, StandardSectionKey, CustomSection } from "@/lib/types/cv-review";
import {
  initializeReviewState,
  filterEnabledItems,
  hasAnyEnabledItems,
  countEnabledItems,
} from "@/lib/types/cv-review";
import {
  ProfileSection,
  WorkExperienceSection,
  EducationSection,
  PracticalExperienceSection,
  CertificationsSection,
  PublicationsSection,
  UnmatchedDataSection,
} from "./cv-review";

interface CvImportReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importData: CvImportData;
  sourceText: string;
  existingCustomSections?: CustomSection[]; // NEW: from database
  onConfirm: (
    filteredData: CvImportData,
    sourceText: string,
    customSections: CustomSectionToCreate[]
  ) => void;
}

export function CvImportReviewModal({
  open,
  onOpenChange,
  importData,
  sourceText,
  existingCustomSections = [],
  onConfirm,
}: CvImportReviewModalProps) {
  const [reviewState, setReviewState] = useState<CvReviewState>(() =>
    initializeReviewState(importData)
  );

  // Reset state when importData changes
  useEffect(() => {
    if (open) {
      setReviewState(initializeReviewState(importData));
      setExpandedSections([]); // Start with all sections collapsed
    }
  }, [importData, open]);

  const hasEnabled = useMemo(() => hasAnyEnabledItems(reviewState), [reviewState]);
  const enabledCount = useMemo(() => countEnabledItems(reviewState), [reviewState]);

// State for accordion - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const handleConfirm = () => {
    const filteredData = filterEnabledItems(reviewState);
    onConfirm(filteredData, sourceText, reviewState.customSectionsToCreate);
  };

  const toggleAllItems = (enabled: boolean) => {
    setReviewState((prev) => {
      // Toggle profile fields
      const profile = prev.profile
        ? Object.fromEntries(
            Object.entries(prev.profile).map(([key, field]) => [
              key,
              { ...field, enabled: field.value != null && enabled },
            ])
          ) as typeof prev.profile
        : null;

      return {
        ...prev,
        profile,
        workExperiences: prev.workExperiences.map((i) => ({ ...i, _enabled: enabled })),
        educationEntries: prev.educationEntries.map((i) => ({ ...i, _enabled: enabled })),
        practicalExperiences: prev.practicalExperiences.map((i) => ({ ...i, _enabled: enabled })),
        certifications: prev.certifications.map((i) => ({ ...i, _enabled: enabled })),
        publications: prev.publications.map((i) => ({ ...i, _enabled: enabled })),
      };
    });
  };

  // Helper function to create items from raw text
  const createItemFromRawText = (sectionKey: StandardSectionKey, rawText: string): any => {
    const baseItem = {
      _tempId: `${sectionKey}-${Date.now()}-${Math.random()}`,
      _enabled: true,
    };

    switch (sectionKey) {
      case 'workExperiences':
        return { ...baseItem, klinik: rawText, station: null, zeitraum_von: null, zeitraum_bis: null, taetigkeiten: null };
      case 'educationEntries':
        return { ...baseItem, universitaet: rawText, abschluss: null, zeitraum_von: null, zeitraum_bis: null, abschlussarbeit: null };
      case 'practicalExperiences':
        return { ...baseItem, einrichtung: rawText, typ: null, fachbereich: null, zeitraum_von: null, zeitraum_bis: null, beschreibung: null };
      case 'certifications':
        return { ...baseItem, name: rawText, aussteller: null, datum: null };
      case 'publications':
        return { ...baseItem, titel: rawText, typ: null, journal_ort: null, datum: null, beschreibung: null };
    }
  };

  // Handle assignment to standard section
  const handleAssignToStandardSection = (sectionKey: StandardSectionKey, rawText: string) => {
    const newItem = createItemFromRawText(sectionKey, rawText);

    setReviewState((prev) => ({
      ...prev,
      [sectionKey]: [...prev[sectionKey], newItem],
    }));
  };

  // Handle assignment to existing custom section
  const handleAssignToCustomSection = (sectionId: string, rawText: string) => {
    const section = existingCustomSections.find(s => s.id === sectionId);
    if (!section) return;

    // Find or create CustomSectionToCreate with existingSectionId
    setReviewState((prev) => {
      const existing = prev.customSectionsToCreate.find(
        s => s.existingSectionId === sectionId
      );

      if (existing) {
        // Add to existing
        return {
          ...prev,
          customSectionsToCreate: prev.customSectionsToCreate.map(s =>
            s.existingSectionId === sectionId
              ? { ...s, entries: [...s.entries, { title: rawText, description: null }] }
              : s
          ),
        };
      } else {
        // Create new with existingSectionId set
        return {
          ...prev,
          customSectionsToCreate: [
            ...prev.customSectionsToCreate,
            {
              sectionName: section.section_name,
              existingSectionId: sectionId,
              entries: [{ title: rawText, description: null }],
            },
          ],
        };
      }
    });
  };

  const allSelected = useMemo(() => {
    const profileAllSelected = reviewState.profile
      ? Object.values(reviewState.profile).every((f) => f.value == null || f.enabled)
      : true;

    return (
      profileAllSelected &&
      reviewState.workExperiences.every((i) => i._enabled) &&
      reviewState.educationEntries.every((i) => i._enabled) &&
      reviewState.practicalExperiences.every((i) => i._enabled) &&
      reviewState.certifications.every((i) => i._enabled) &&
      reviewState.publications.every((i) => i._enabled)
    );
  }, [reviewState]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            CV Import - Daten überprüfen
          </DialogTitle>
          <DialogDescription>
            Überprüfen und bearbeiten Sie die importierten Daten vor dem Übernehmen.
            Aktivieren oder deaktivieren Sie einzelne Einträge nach Bedarf.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto pr-2">
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="w-full space-y-2"
          >
            <ProfileSection
              data={reviewState.profile}
              onChange={(profile) => setReviewState((prev) => ({ ...prev, profile }))}
            />

            <WorkExperienceSection
              items={reviewState.workExperiences}
              onChange={(workExperiences) =>
                setReviewState((prev) => ({ ...prev, workExperiences }))
              }
            />

            <EducationSection
              items={reviewState.educationEntries}
              onChange={(educationEntries) =>
                setReviewState((prev) => ({ ...prev, educationEntries }))
              }
            />

            <PracticalExperienceSection
              items={reviewState.practicalExperiences}
              onChange={(practicalExperiences) =>
                setReviewState((prev) => ({ ...prev, practicalExperiences }))
              }
            />

            <CertificationsSection
              items={reviewState.certifications}
              onChange={(certifications) =>
                setReviewState((prev) => ({ ...prev, certifications }))
              }
            />

            <PublicationsSection
              items={reviewState.publications}
              onChange={(publications) =>
                setReviewState((prev) => ({ ...prev, publications }))
              }
            />

            <UnmatchedDataSection
              items={reviewState.unmatchedData}
              customSections={reviewState.customSectionsToCreate}
              existingCustomSections={existingCustomSections}
              onChange={(unmatchedData) =>
                setReviewState((prev) => ({ ...prev, unmatchedData }))
              }
              onCustomSectionsChange={(customSectionsToCreate) =>
                setReviewState((prev) => ({ ...prev, customSectionsToCreate }))
              }
              onAssignToStandardSection={handleAssignToStandardSection}
              onAssignToCustomSection={handleAssignToCustomSection}
            />
          </Accordion>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={(checked) => toggleAllItems(!!checked)}
            />
            <Label htmlFor="select-all" className="text-sm">
              Alle auswählen
            </Label>
            <span className="text-sm text-muted-foreground ml-2">
              ({enabledCount} ausgewählt)
            </span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={!hasEnabled}>
            Daten übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

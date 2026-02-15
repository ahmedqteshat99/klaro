import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { SectionAssignment, StandardSectionKey } from "@/lib/types/cv-review";
import type { CustomSection } from "@/lib/types/cv-review";
import { STANDARD_SECTION_LABELS } from "@/lib/types/cv-review";

interface SectionAssignmentSelectProps {
  customSections: CustomSection[];
  onSelect: (assignment: SectionAssignment) => void;
  currentAssignment?: SectionAssignment | null;
}

const SectionAssignmentSelect = ({
  customSections,
  onSelect,
  currentAssignment,
}: SectionAssignmentSelectProps) => {
  const [selectedType, setSelectedType] = useState<string>("");
  const [newSectionName, setNewSectionName] = useState("");

  const handleSelectChange = (value: string) => {
    setSelectedType(value);

    if (value === "new-section") {
      // User wants to create a new section - show input
      setNewSectionName("");
      return;
    }

    // Standard section selected
    if (value.startsWith("standard-")) {
      const sectionKey = value.replace("standard-", "") as StandardSectionKey;
      onSelect({ type: "standard", sectionKey });
      return;
    }

    // Custom section selected
    if (value.startsWith("custom-")) {
      const sectionId = value.replace("custom-", "");
      const section = customSections.find(s => s.id === sectionId);
      if (section) {
        onSelect({
          type: "custom",
          sectionId: section.id,
          sectionName: section.section_name,
        });
      }
      return;
    }
  };

  const handleNewSectionSubmit = () => {
    if (!newSectionName.trim()) return;
    onSelect({ type: "new", sectionName: newSectionName.trim() });
    setNewSectionName("");
    setSelectedType("");
  };

  const getDisplayValue = () => {
    if (!currentAssignment) return "Sektion auswählen...";

    if (currentAssignment.type === "standard") {
      return STANDARD_SECTION_LABELS[currentAssignment.sectionKey];
    }

    if (currentAssignment.type === "custom") {
      return currentAssignment.sectionName;
    }

    if (currentAssignment.type === "new") {
      return currentAssignment.sectionName;
    }

    return "Sektion auswählen...";
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Zuordnen zu:</Label>
        <Select onValueChange={handleSelectChange} value={selectedType}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Sektion auswählen...">
              {getDisplayValue()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Standard-Sektionen</SelectLabel>
              {(Object.keys(STANDARD_SECTION_LABELS) as StandardSectionKey[]).map((key) => (
                <SelectItem key={key} value={`standard-${key}`}>
                  {STANDARD_SECTION_LABELS[key]}
                </SelectItem>
              ))}
            </SelectGroup>

            {customSections.length > 0 && (
              <SelectGroup>
                <SelectLabel>Eigene Sektionen</SelectLabel>
                {customSections.map((section) => (
                  <SelectItem key={section.id} value={`custom-${section.id}`}>
                    {section.section_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}

            <SelectGroup>
              <SelectItem value="new-section">+ Neue Sektion erstellen</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {selectedType === "new-section" && (
        <div className="space-y-2 pl-4 border-l-2 border-primary/20">
          <Label htmlFor="new-section-name">Sektionsname:</Label>
          <Input
            id="new-section-name"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="z.B. Fortbildungen, Ehrenämter..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSectionName.trim()) {
                handleNewSectionSubmit();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleNewSectionSubmit}
            disabled={!newSectionName.trim()}
            className="w-full"
          >
            Zuordnen
          </Button>
        </div>
      )}
    </div>
  );
};

export default SectionAssignmentSelect;

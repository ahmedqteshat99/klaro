import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Trash2 } from "lucide-react";
import type { UnmatchedDataItem, CustomSectionToCreate, SectionAssignment, StandardSectionKey, CustomSection } from "@/lib/types/cv-review";
import SectionAssignmentSelect from "./SectionAssignmentSelect";
import { STANDARD_SECTION_LABELS } from "@/lib/types/cv-review";

interface UnmatchedDataSectionProps {
  items: UnmatchedDataItem[];
  customSections: CustomSectionToCreate[];
  existingCustomSections: CustomSection[]; // NEW: from database
  onChange: (items: UnmatchedDataItem[]) => void;
  onCustomSectionsChange: (sections: CustomSectionToCreate[]) => void;
  onAssignToStandardSection?: (sectionKey: StandardSectionKey, rawText: string) => void; // NEW
  onAssignToCustomSection?: (sectionId: string, rawText: string) => void; // NEW
}

export function UnmatchedDataSection({
  items,
  customSections,
  existingCustomSections,
  onChange,
  onCustomSectionsChange,
  onAssignToStandardSection,
  onAssignToCustomSection,
}: UnmatchedDataSectionProps) {
  const enabledCount = items.filter((i) => i._enabled).length;

  const toggleItem = (tempId: string) => {
    onChange(
      items.map((item) =>
        item._tempId === tempId ? { ...item, _enabled: !item._enabled } : item
      )
    );
  };

  const deleteItem = (tempId: string) => {
    onChange(items.filter((item) => item._tempId !== tempId));
  };

  const handleAssignment = (item: UnmatchedDataItem, assignment: SectionAssignment) => {
    if (assignment.type === 'standard') {
      // Assign to standard section
      if (onAssignToStandardSection) {
        onAssignToStandardSection(assignment.sectionKey, item.rawText);
      }

      // Mark item as assigned
      onChange(
        items.map((i) =>
          i._tempId === item._tempId
            ? { ...i, _enabled: true, assignment, assignedSection: null }
            : i
        )
      );
    } else if (assignment.type === 'custom') {
      // Assign to existing custom section
      if (onAssignToCustomSection) {
        onAssignToCustomSection(assignment.sectionId, item.rawText);
      }

      // Mark item as assigned
      onChange(
        items.map((i) =>
          i._tempId === item._tempId
            ? { ...i, _enabled: true, assignment, assignedSection: null }
            : i
        )
      );
    } else if (assignment.type === 'new') {
      // Create new custom section (existing behavior)
      const sectionName = assignment.sectionName;

      // Check if section already exists in customSections
      const existingSection = customSections.find(
        (s) => s.sectionName.toLowerCase() === sectionName.toLowerCase()
      );

      if (existingSection) {
        // Add entry to existing section
        onCustomSectionsChange(
          customSections.map((s) =>
            s.sectionName.toLowerCase() === sectionName.toLowerCase()
              ? {
                  ...s,
                  entries: [...s.entries, { title: item.rawText, description: null }],
                }
              : s
          )
        );
      } else {
        // Create new section with this entry
        onCustomSectionsChange([
          ...customSections,
          {
            sectionName,
            entries: [{ title: item.rawText, description: null }],
          },
        ]);
      }

      // Mark item as enabled and assigned
      onChange(
        items.map((i) =>
          i._tempId === item._tempId
            ? { ...i, _enabled: true, assignment, assignedSection: sectionName }
            : i
        )
      );
    }
  };

  const removeAssignment = (item: UnmatchedDataItem) => {
    if (!item.assignment) return;

    if (item.assignment.type === 'standard') {
      // Cannot remove from standard section easily - just unmark as enabled
      onChange(
        items.map((i) =>
          i._tempId === item._tempId
            ? { ...i, _enabled: false, assignment: null }
            : i
        )
      );
    } else if (item.assignment.type === 'custom') {
      // Cannot remove from existing custom section easily - just unmark as enabled
      onChange(
        items.map((i) =>
          i._tempId === item._tempId
            ? { ...i, _enabled: false, assignment: null }
            : i
        )
      );
    } else if (item.assignment.type === 'new' && item.assignedSection) {
      // Remove entry from new custom section
      onCustomSectionsChange(
        customSections
          .map((s) =>
            s.sectionName === item.assignedSection
              ? {
                  ...s,
                  entries: s.entries.filter((e) => e.title !== item.rawText),
                }
              : s
          )
          .filter((s) => s.entries.length > 0)
      );

      // Unassign from section
      onChange(
        items.map((i) =>
          i._tempId === item._tempId
            ? { ...i, _enabled: false, assignment: null, assignedSection: null }
            : i
        )
      );
    }
  };

  const getAssignmentBadgeText = (item: UnmatchedDataItem): string => {
    if (!item.assignment) return "";

    if (item.assignment.type === 'standard') {
      return STANDARD_SECTION_LABELS[item.assignment.sectionKey];
    } else if (item.assignment.type === 'custom') {
      return item.assignment.sectionName;
    } else if (item.assignment.type === 'new') {
      return item.assignment.sectionName;
    }

    return "";
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <AccordionItem value="unmatchedData">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          <span>Nicht zugeordnete Daten</span>
          <Badge variant="secondary">{enabledCount}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-sm text-muted-foreground mb-3">
          Diese Daten konnten keiner bestehenden Kategorie zugeordnet werden. Sie können sie Standard-Sektionen, eigenen Sektionen oder neuen Sektionen zuordnen.
        </p>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item._tempId}
              className={`border rounded-lg p-3 ${item.assignment ? "border-green-500 bg-green-50/50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item._enabled}
                  onCheckedChange={() => toggleItem(item._tempId)}
                  className="mt-1"
                  disabled={!!item.assignment}
                />
                <div className="flex-1 min-w-0 space-y-3">
                  <p className="text-sm line-clamp-3">{item.rawText}</p>

                  {item.assignment ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        ✓ {getAssignmentBadgeText(item)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => removeAssignment(item)}
                      >
                        Zuordnung aufheben
                      </Button>
                    </div>
                  ) : (
                    <SectionAssignmentSelect
                      customSections={existingCustomSections}
                      currentAssignment={item.assignment}
                      onSelect={(assignment) => handleAssignment(item, assignment)}
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive flex-shrink-0"
                  onClick={() => deleteItem(item._tempId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {customSections.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Neue Sektionen zu erstellen:</h4>
            <div className="space-y-2">
              {customSections.map((section, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline">{section.sectionName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    ({section.entries.length} {section.entries.length === 1 ? "Eintrag" : "Einträge"})
                  </span>
                  {section.existingSectionId && (
                    <Badge variant="secondary" className="text-xs">Bestehende Sektion</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

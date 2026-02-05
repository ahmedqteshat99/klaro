import { useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Plus, Trash2 } from "lucide-react";
import type { UnmatchedDataItem, CustomSectionToCreate } from "@/lib/types/cv-review";

interface UnmatchedDataSectionProps {
  items: UnmatchedDataItem[];
  customSections: CustomSectionToCreate[];
  onChange: (items: UnmatchedDataItem[]) => void;
  onCustomSectionsChange: (sections: CustomSectionToCreate[]) => void;
}

export function UnmatchedDataSection({
  items,
  customSections,
  onChange,
  onCustomSectionsChange,
}: UnmatchedDataSectionProps) {
  const [newSectionName, setNewSectionName] = useState<Record<string, string>>({});

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

  const createSectionFromItem = (item: UnmatchedDataItem) => {
    const sectionName = newSectionName[item._tempId]?.trim();
    if (!sectionName) return;

    // Check if section already exists
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
          ? { ...i, _enabled: true, assignedSection: sectionName }
          : i
      )
    );

    // Clear the input
    setNewSectionName((prev) => ({ ...prev, [item._tempId]: "" }));
  };

  const removeFromSection = (item: UnmatchedDataItem) => {
    if (!item.assignedSection) return;

    // Remove entry from custom section
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
          ? { ...i, _enabled: false, assignedSection: null }
          : i
      )
    );
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
          Diese Daten konnten keiner bestehenden Kategorie zugeordnet werden. Sie können neue
          Sektionen erstellen, um diese Daten zu importieren.
        </p>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item._tempId}
              className={`border rounded-lg p-3 ${item.assignedSection ? "border-green-500 bg-green-50" : ""}`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={item._enabled}
                  onCheckedChange={() => toggleItem(item._tempId)}
                  className="mt-1"
                  disabled={!!item.assignedSection}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-clamp-3">{item.rawText}</p>
                  {item.assignedSection ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {item.assignedSection}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-destructive"
                        onClick={() => removeFromSection(item)}
                      >
                        Entfernen
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        placeholder="Neue Sektion erstellen..."
                        value={newSectionName[item._tempId] || ""}
                        onChange={(e) =>
                          setNewSectionName((prev) => ({
                            ...prev,
                            [item._tempId]: e.target.value,
                          }))
                        }
                        className="h-8 text-sm flex-1 max-w-[250px]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            createSectionFromItem(item);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => createSectionFromItem(item)}
                        disabled={!newSectionName[item._tempId]?.trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Erstellen
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
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
                </div>
              ))}
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

import { useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Pencil, Trash2, Check, X } from "lucide-react";
import type { CvReviewPracticalExperience } from "@/lib/types/cv-review";
import EmptyStateActions from "./EmptyStateActions";

interface PracticalExperienceSectionProps{
  items: CvReviewPracticalExperience[];
  onChange: (items: CvReviewPracticalExperience[]) => void;
}

export function PracticalExperienceSection({ items, onChange }: PracticalExperienceSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CvReviewPracticalExperience>>({});

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

  const startEdit = (item: CvReviewPracticalExperience) => {
    setEditForm(item);
    setEditingId(item._tempId);
  };

  const cancelEdit = () => {
    setEditForm({});
    setEditingId(null);
  };

  const saveEdit = () => {
    if (!editingId) return;
    onChange(
      items.map((item) =>
        item._tempId === editingId ? { ...item, ...editForm } : item
      )
    );
    setEditForm({});
    setEditingId(null);
  };

  const formatDateRange = (von?: string | null, bis?: string | null) => {
    if (!von && !bis) return "";
    const formatDate = (d: string) => {
      const [year, month] = d.split("-");
      return `${month}/${year}`;
    };
    const vonStr = von ? formatDate(von) : "";
    const bisStr = bis ? formatDate(bis) : "heute";
    return `${vonStr} - ${bisStr}`;
  };

  return (
    <AccordionItem value="practicalExperiences">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4" />
          <span>Praktische Erfahrung</span>
          <Badge variant="secondary">{enabledCount}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {items.length === 0 ? (
          <EmptyStateActions
            message="Keine praktische Erfahrung erkannt."
            sectionType="practical"
            onQuickAdd={(data) => {
              const newItem = {
                ...data,
                _tempId: `prac-${Date.now()}-${Math.random()}`,
                _enabled: true,
              };
              onChange([...items, newItem]);
            }}
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item._tempId}
                className={`border rounded-lg p-3 ${!item._enabled ? "opacity-50" : ""}`}
              >
                {editingId === item._tempId ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Einrichtung</Label>
                        <Input
                          value={editForm.einrichtung || ""}
                          onChange={(e) => setEditForm({ ...editForm, einrichtung: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Fachbereich</Label>
                        <Input
                          value={editForm.fachbereich || ""}
                          onChange={(e) => setEditForm({ ...editForm, fachbereich: e.target.value })}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Typ</Label>
                        <Input
                          value={editForm.typ || ""}
                          onChange={(e) => setEditForm({ ...editForm, typ: e.target.value })}
                          placeholder="Famulatur, PJ, etc."
                          className="h-8"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Von</Label>
                          <Input
                            value={editForm.zeitraum_von || ""}
                            onChange={(e) => setEditForm({ ...editForm, zeitraum_von: e.target.value })}
                            placeholder="YYYY-MM-DD"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Bis</Label>
                          <Input
                            value={editForm.zeitraum_bis || ""}
                            onChange={(e) => setEditForm({ ...editForm, zeitraum_bis: e.target.value })}
                            placeholder="YYYY-MM-DD"
                            className="h-8"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Beschreibung</Label>
                      <Textarea
                        value={editForm.beschreibung || ""}
                        onChange={(e) => setEditForm({ ...editForm, beschreibung: e.target.value })}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X className="h-4 w-4 mr-1" />
                        Abbrechen
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-4 w-4 mr-1" />
                        Speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={item._enabled}
                      onCheckedChange={() => toggleItem(item._tempId)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.einrichtung}</h4>
                      <div className="text-sm text-muted-foreground">
                        {item.typ && <Badge variant="outline" className="mr-2 text-xs">{item.typ}</Badge>}
                        {item.fachbereich && <span>{item.fachbereich}</span>}
                        {item.fachbereich && (item.zeitraum_von || item.zeitraum_bis) && " | "}
                        {formatDateRange(item.zeitraum_von, item.zeitraum_bis)}
                      </div>
                      {item.beschreibung && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.beschreibung}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
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
                )}
              </div>
            ))}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

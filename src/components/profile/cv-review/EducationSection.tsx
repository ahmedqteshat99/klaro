import { useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Pencil, Trash2, Check, X } from "lucide-react";
import type { CvReviewEducationEntry } from "@/lib/types/cv-review";

interface EducationSectionProps {
  items: CvReviewEducationEntry[];
  onChange: (items: CvReviewEducationEntry[]) => void;
}

export function EducationSection({ items, onChange }: EducationSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CvReviewEducationEntry>>({});

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

  const startEdit = (item: CvReviewEducationEntry) => {
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
    <AccordionItem value="educationEntries">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" />
          <span>Ausbildung</span>
          <Badge variant="secondary">{enabledCount}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Keine Ausbildung erkannt.
          </p>
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
                        <Label className="text-xs">Universität</Label>
                        <Input
                          value={editForm.universitaet || ""}
                          onChange={(e) => setEditForm({ ...editForm, universitaet: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Abschluss</Label>
                        <Input
                          value={editForm.abschluss || ""}
                          onChange={(e) => setEditForm({ ...editForm, abschluss: e.target.value })}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Von (YYYY-MM-DD)</Label>
                        <Input
                          value={editForm.zeitraum_von || ""}
                          onChange={(e) => setEditForm({ ...editForm, zeitraum_von: e.target.value })}
                          placeholder="2015-10-01"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bis (YYYY-MM-DD)</Label>
                        <Input
                          value={editForm.zeitraum_bis || ""}
                          onChange={(e) => setEditForm({ ...editForm, zeitraum_bis: e.target.value })}
                          placeholder="2021-06-01"
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Abschlussarbeit</Label>
                      <Input
                        value={editForm.abschlussarbeit || ""}
                        onChange={(e) => setEditForm({ ...editForm, abschlussarbeit: e.target.value })}
                        className="h-8"
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
                      <h4 className="font-medium truncate">{item.universitaet}</h4>
                      <div className="text-sm text-muted-foreground">
                        {item.abschluss && <span>{item.abschluss}</span>}
                        {item.abschluss && (item.zeitraum_von || item.zeitraum_bis) && " | "}
                        {formatDateRange(item.zeitraum_von, item.zeitraum_bis)}
                      </div>
                      {item.abschlussarbeit && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          Thesis: {item.abschlussarbeit}
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

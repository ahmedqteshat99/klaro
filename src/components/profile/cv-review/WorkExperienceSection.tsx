import { useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Pencil, Trash2, Check, X } from "lucide-react";
import type { CvReviewWorkExperience } from "@/lib/types/cv-review";

interface WorkExperienceSectionProps {
  items: CvReviewWorkExperience[];
  onChange: (items: CvReviewWorkExperience[]) => void;
}

export function WorkExperienceSection({ items, onChange }: WorkExperienceSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CvReviewWorkExperience>>({});

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

  const startEdit = (item: CvReviewWorkExperience) => {
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
    <AccordionItem value="workExperiences">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>Berufserfahrung</span>
          <Badge variant="secondary">{enabledCount}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Keine Berufserfahrung erkannt.
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
                        <Label className="text-xs">Klinik</Label>
                        <Input
                          value={editForm.klinik || ""}
                          onChange={(e) => setEditForm({ ...editForm, klinik: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Station</Label>
                        <Input
                          value={editForm.station || ""}
                          onChange={(e) => setEditForm({ ...editForm, station: e.target.value })}
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
                          placeholder="2020-01-01"
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Bis (YYYY-MM-DD)</Label>
                        <Input
                          value={editForm.zeitraum_bis || ""}
                          onChange={(e) => setEditForm({ ...editForm, zeitraum_bis: e.target.value })}
                          placeholder="2022-06-01"
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Tätigkeiten</Label>
                      <Textarea
                        value={editForm.taetigkeiten || ""}
                        onChange={(e) => setEditForm({ ...editForm, taetigkeiten: e.target.value })}
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
                      <h4 className="font-medium truncate">{item.klinik}</h4>
                      <div className="text-sm text-muted-foreground">
                        {item.station && <span>{item.station}</span>}
                        {item.station && (item.zeitraum_von || item.zeitraum_bis) && " | "}
                        {formatDateRange(item.zeitraum_von, item.zeitraum_bis)}
                      </div>
                      {item.taetigkeiten && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.taetigkeiten}
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

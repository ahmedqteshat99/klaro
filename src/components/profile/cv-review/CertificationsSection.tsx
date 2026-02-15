import { useState } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Award, Pencil, Trash2, Check, X } from "lucide-react";
import type { CvReviewCertification } from "@/lib/types/cv-review";
import EmptyStateActions from "./EmptyStateActions";

interface CertificationsSectionProps {
  items: CvReviewCertification[];
  onChange: (items: CvReviewCertification[]) => void;
}

export function CertificationsSection({ items, onChange }: CertificationsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CvReviewCertification>>({});

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

  const startEdit = (item: CvReviewCertification) => {
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

  const formatDate = (datum?: string | null) => {
    if (!datum) return "";
    const [year, month] = datum.split("-");
    return `${month}/${year}`;
  };

  return (
    <AccordionItem value="certifications">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4" />
          <span>Zertifikate</span>
          <Badge variant="secondary">{enabledCount}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {items.length === 0 ? (
          <EmptyStateActions
            message="Keine Zertifikate erkannt."
            sectionType="certifications"
            onQuickAdd={(data) => {
              const newItem = {
                ...data,
                _tempId: `cert-${Date.now()}-${Math.random()}`,
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
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Aussteller</Label>
                        <Input
                          value={editForm.aussteller || ""}
                          onChange={(e) => setEditForm({ ...editForm, aussteller: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Datum (YYYY-MM-DD)</Label>
                        <Input
                          value={editForm.datum || ""}
                          onChange={(e) => setEditForm({ ...editForm, datum: e.target.value })}
                          placeholder="2023-05-01"
                          className="h-8"
                        />
                      </div>
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
                      <h4 className="font-medium truncate">{item.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {item.aussteller && <span>{item.aussteller}</span>}
                        {item.aussteller && item.datum && " | "}
                        {formatDate(item.datum)}
                      </div>
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

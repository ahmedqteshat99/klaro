import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { GraduationCap, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import type { EducationEntry } from "@/hooks/useProfile";

interface EducationFormProps {
  educationEntries: EducationEntry[];
  onAdd: (data: Omit<EducationEntry, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (id: string, data: Partial<EducationEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormData {
  universitaet: string;
  abschluss: string;
  zeitraum_von: Date | null;
  zeitraum_bis: Date | null;
  abschlussarbeit: string;
}

const emptyFormData: FormData = {
  universitaet: "",
  abschluss: "",
  zeitraum_von: null,
  zeitraum_bis: null,
  abschlussarbeit: ""
};

const EducationForm = ({ educationEntries, onAdd, onUpdate, onDelete }: EducationFormProps) => {
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (entry: EducationEntry) => {
    setFormData({
      universitaet: entry.universitaet,
      abschluss: entry.abschluss || "",
      zeitraum_von: entry.zeitraum_von ? new Date(entry.zeitraum_von) : null,
      zeitraum_bis: entry.zeitraum_bis ? new Date(entry.zeitraum_bis) : null,
      abschlussarbeit: entry.abschlussarbeit || ""
    });
    setEditingId(entry.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.universitaet) return;
    setIsSaving(true);
    
    const data = {
      universitaet: formData.universitaet,
      abschluss: formData.abschluss || null,
      zeitraum_von: formData.zeitraum_von?.toISOString().split("T")[0] || null,
      zeitraum_bis: formData.zeitraum_bis?.toISOString().split("T")[0] || null,
      abschlussarbeit: formData.abschlussarbeit || null
    };

    if (editingId) {
      await onUpdate(editingId, data);
    } else {
      await onAdd(data);
    }
    
    setFormData(emptyFormData);
    setEditingId(null);
    setIsDialogOpen(false);
    setIsSaving(false);
  };

  const handleClose = () => {
    setFormData(emptyFormData);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Ausbildung & Studium
            </CardTitle>
            <CardDescription>
              Ihr akademischer Werdegang
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setFormData(emptyFormData); setEditingId(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Ausbildung bearbeiten" : "Neue Ausbildung"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="universitaet">Universität / Hochschule *</Label>
                  <Input
                    id="universitaet"
                    value={formData.universitaet}
                    onChange={(e) => setFormData({ ...formData, universitaet: e.target.value })}
                    placeholder="z.B. Ludwig-Maximilians-Universität München"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abschluss">Abschluss</Label>
                  <Input
                    id="abschluss"
                    value={formData.abschluss}
                    onChange={(e) => setFormData({ ...formData, abschluss: e.target.value })}
                    placeholder="z.B. Staatsexamen Humanmedizin"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <MonthYearPicker
                    label="Von"
                    value={formData.zeitraum_von}
                    onChange={(date) => setFormData({ ...formData, zeitraum_von: date })}
                  />
                  <MonthYearPicker
                    label="Bis"
                    value={formData.zeitraum_bis}
                    onChange={(date) => setFormData({ ...formData, zeitraum_bis: date })}
                    allowPresent
                    presentLabel="Heute"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abschlussarbeit">Thema der Abschlussarbeit (optional)</Label>
                  <Input
                    id="abschlussarbeit"
                    value={formData.abschlussarbeit}
                    onChange={(e) => setFormData({ ...formData, abschlussarbeit: e.target.value })}
                    placeholder="z.B. Doktorarbeit über..."
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={!formData.universitaet || isSaving}>
                  {isSaving ? "Speichern..." : "Speichern"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {educationEntries.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Noch keine Ausbildung hinzugefügt.
          </p>
        ) : (
          <div className="space-y-4">
            {educationEntries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{entry.universitaet}</h4>
                    {entry.abschluss && (
                      <p className="text-sm text-muted-foreground">{entry.abschluss}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {entry.zeitraum_von ? format(new Date(entry.zeitraum_von), "MM/yyyy") : "?"} - {entry.zeitraum_bis ? format(new Date(entry.zeitraum_bis), "MM/yyyy") : "Heute"}
                    </p>
                    {entry.abschlussarbeit && (
                      <p className="text-sm mt-2 italic">{entry.abschlussarbeit}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => handleEdit(entry)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => onDelete(entry.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EducationForm;

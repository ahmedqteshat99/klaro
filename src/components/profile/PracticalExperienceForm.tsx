import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Stethoscope, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import type { PracticalExperience } from "@/hooks/useProfile";

interface PracticalExperienceFormProps {
  practicalExperiences: PracticalExperience[];
  onAdd: (data: Omit<PracticalExperience, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (id: string, data: Partial<PracticalExperience>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormData {
  typ: string;
  einrichtung: string;
  fachbereich: string;
  zeitraum_von: Date | null;
  zeitraum_bis: Date | null;
  beschreibung: string;
}

const PRAKTIKA_TYPEN = [
  "Famulatur",
  "Praktisches Jahr (PJ)",
  "Hospitation",
  "Krankenpflegepraktikum",
  "Sonstiges"
];

const emptyFormData: FormData = {
  typ: "",
  einrichtung: "",
  fachbereich: "",
  zeitraum_von: null,
  zeitraum_bis: null,
  beschreibung: ""
};

const PracticalExperienceForm = ({ practicalExperiences, onAdd, onUpdate, onDelete }: PracticalExperienceFormProps) => {
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (exp: PracticalExperience) => {
    setFormData({
      typ: exp.typ || "",
      einrichtung: exp.einrichtung,
      fachbereich: exp.fachbereich || "",
      zeitraum_von: exp.zeitraum_von ? new Date(exp.zeitraum_von) : null,
      zeitraum_bis: exp.zeitraum_bis ? new Date(exp.zeitraum_bis) : null,
      beschreibung: exp.beschreibung || ""
    });
    setEditingId(exp.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.einrichtung) return;
    setIsSaving(true);
    
    const data = {
      typ: formData.typ || null,
      einrichtung: formData.einrichtung,
      fachbereich: formData.fachbereich || null,
      zeitraum_von: formData.zeitraum_von?.toISOString().split("T")[0] || null,
      zeitraum_bis: formData.zeitraum_bis?.toISOString().split("T")[0] || null,
      beschreibung: formData.beschreibung || null
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
              <Stethoscope className="h-5 w-5" />
              Praktische Erfahrung
            </CardTitle>
            <CardDescription>
              Famulaturen, PJ-Stationen und Hospitationen
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setFormData(emptyFormData); setEditingId(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Praktische Erfahrung bearbeiten" : "Neue praktische Erfahrung"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select
                    value={formData.typ}
                    onValueChange={(value) => setFormData({ ...formData, typ: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Typ auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PRAKTIKA_TYPEN.map((typ) => (
                        <SelectItem key={typ} value={typ}>
                          {typ}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="einrichtung">Einrichtung *</Label>
                  <Input
                    id="einrichtung"
                    value={formData.einrichtung}
                    onChange={(e) => setFormData({ ...formData, einrichtung: e.target.value })}
                    placeholder="z.B. Universitätsklinikum Freiburg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fachbereich">Fachbereich / Abteilung</Label>
                  <Input
                    id="fachbereich"
                    value={formData.fachbereich}
                    onChange={(e) => setFormData({ ...formData, fachbereich: e.target.value })}
                    placeholder="z.B. Chirurgie, Innere Medizin"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="beschreibung">Beschreibung</Label>
                  <Textarea
                    id="beschreibung"
                    value={formData.beschreibung}
                    onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                    placeholder="Erläutern Sie Ihre Tätigkeiten und Erfahrungen..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={!formData.einrichtung || isSaving}>
                  {isSaving ? "Speichern..." : "Speichern"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {practicalExperiences.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Noch keine praktische Erfahrung hinzugefügt.
          </p>
        ) : (
          <div className="space-y-4">
            {practicalExperiences.map((exp) => (
              <div key={exp.id} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{exp.einrichtung}</h4>
                      {exp.typ && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {exp.typ}
                        </span>
                      )}
                    </div>
                    {exp.fachbereich && (
                      <p className="text-sm text-muted-foreground">{exp.fachbereich}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {exp.zeitraum_von ? format(new Date(exp.zeitraum_von), "MM/yyyy") : "?"} - {exp.zeitraum_bis ? format(new Date(exp.zeitraum_bis), "MM/yyyy") : "Heute"}
                    </p>
                    {exp.beschreibung && (
                      <p className="text-sm mt-2 whitespace-pre-wrap">{exp.beschreibung}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(exp.id)}>
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

export default PracticalExperienceForm;

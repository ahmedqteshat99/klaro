import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import type { WorkExperience } from "@/hooks/useProfile";

interface WorkExperienceFormProps {
  workExperiences: WorkExperience[];
  onAdd: (data: Omit<WorkExperience, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (id: string, data: Partial<WorkExperience>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormData {
  klinik: string;
  station: string;
  zeitraum_von: Date | null;
  zeitraum_bis: Date | null;
  taetigkeiten: string;
}

const emptyFormData: FormData = {
  klinik: "",
  station: "",
  zeitraum_von: null,
  zeitraum_bis: null,
  taetigkeiten: ""
};

const WorkExperienceForm = ({ workExperiences, onAdd, onUpdate, onDelete }: WorkExperienceFormProps) => {
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (exp: WorkExperience) => {
    setFormData({
      klinik: exp.klinik,
      station: exp.station || "",
      zeitraum_von: exp.zeitraum_von ? new Date(exp.zeitraum_von) : null,
      zeitraum_bis: exp.zeitraum_bis ? new Date(exp.zeitraum_bis) : null,
      taetigkeiten: exp.taetigkeiten || ""
    });
    setEditingId(exp.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.klinik) return;
    setIsSaving(true);
    
    const data = {
      klinik: formData.klinik,
      station: formData.station || null,
      zeitraum_von: formData.zeitraum_von?.toISOString().split("T")[0] || null,
      zeitraum_bis: formData.zeitraum_bis?.toISOString().split("T")[0] || null,
      taetigkeiten: formData.taetigkeiten || null
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
              <Building2 className="h-5 w-5" />
              Berufserfahrung
            </CardTitle>
            <CardDescription>
              Ihre bisherigen Stellen in Kliniken und Praxen
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
                  {editingId ? "Berufserfahrung bearbeiten" : "Neue Berufserfahrung"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="klinik">Klinik / Arbeitgeber *</Label>
                  <Input
                    id="klinik"
                    value={formData.klinik}
                    onChange={(e) => setFormData({ ...formData, klinik: e.target.value })}
                    placeholder="z.B. Universitätsklinikum Heidelberg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="station">Station / Abteilung</Label>
                  <Input
                    id="station"
                    value={formData.station}
                    onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                    placeholder="z.B. Innere Medizin Station 3"
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
                  <Label htmlFor="taetigkeiten">Tätigkeiten & Prozeduren</Label>
                  <Textarea
                    id="taetigkeiten"
                    value={formData.taetigkeiten}
                    onChange={(e) => setFormData({ ...formData, taetigkeiten: e.target.value })}
                    placeholder="Beschreiben Sie Ihre Aufgaben und durchgeführte Prozeduren..."
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={!formData.klinik || isSaving}>
                  {isSaving ? "Speichern..." : "Speichern"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {workExperiences.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Noch keine Berufserfahrung hinzugefügt.
          </p>
        ) : (
          <div className="space-y-4">
            {workExperiences.map((exp) => (
              <div key={exp.id} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{exp.klinik}</h4>
                    {exp.station && (
                      <p className="text-sm text-muted-foreground">{exp.station}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {exp.zeitraum_von ? format(new Date(exp.zeitraum_von), "MM/yyyy") : "?"} - {exp.zeitraum_bis ? format(new Date(exp.zeitraum_bis), "MM/yyyy") : "Heute"}
                    </p>
                    {exp.taetigkeiten && (
                      <p className="text-sm mt-2 whitespace-pre-wrap">{exp.taetigkeiten}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => handleEdit(exp)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => onDelete(exp.id)}>
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

export default WorkExperienceForm;

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Award, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MonthYearPicker from "@/components/ui/MonthYearPicker";
import { toLocalDateString } from "@/lib/date-utils";
import type { Certification } from "@/hooks/useProfile";

interface CertificationsFormProps {
  certifications: Certification[];
  onAdd: (data: Omit<Certification, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (id: string, data: Partial<Certification>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormData {
  name: string;
  aussteller: string;
  datum: Date | null;
}

const emptyFormData: FormData = {
  name: "",
  aussteller: "",
  datum: null
};

const CertificationsForm = ({ certifications, onAdd, onUpdate, onDelete }: CertificationsFormProps) => {
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (cert: Certification) => {
    setFormData({
      name: cert.name,
      aussteller: cert.aussteller || "",
      datum: cert.datum ? new Date(cert.datum) : null
    });
    setEditingId(cert.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;
    setIsSaving(true);

    const data = {
      name: formData.name,
      aussteller: formData.aussteller || null,
      datum: formData.datum ? toLocalDateString(formData.datum) : null
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
              <Award className="h-5 w-5" />
              Fortbildungen & Zertifikate
            </CardTitle>
            <CardDescription>
              ACLS, ATLS, Ultraschallkurse und weitere Qualifikationen
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setFormData(emptyFormData); setEditingId(null); }}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Zertifikat bearbeiten" : "Neues Zertifikat"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Bezeichnung *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. ACLS Provider, Sonographie-Kurs"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aussteller">Aussteller</Label>
                  <Input
                    id="aussteller"
                    value={formData.aussteller}
                    onChange={(e) => setFormData({ ...formData, aussteller: e.target.value })}
                    placeholder="z.B. American Heart Association"
                  />
                </div>
                <MonthYearPicker
                  label="Datum"
                  value={formData.datum}
                  onChange={(date) => {
                    setFormData({ ...formData, datum: date });
                  }}
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={!formData.name || isSaving}>
                  {isSaving ? "Speichern..." : "Speichern"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {certifications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Noch keine Zertifikate hinzugefügt.
          </p>
        ) : (
          <div className="space-y-3">
            {certifications.map((cert) => (
              <div key={cert.id} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium">{cert.name}</h4>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                      {cert.aussteller && <span>{cert.aussteller}</span>}
                      {cert.datum && <span>• {format(new Date(cert.datum), "MM/yyyy")}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => handleEdit(cert)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => onDelete(cert.id)}>
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

export default CertificationsForm;

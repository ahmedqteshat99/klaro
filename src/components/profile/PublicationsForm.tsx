import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { BookOpen, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { MonthYearPicker } from "@/components/ui/MonthYearPicker";
import { toLocalDateString } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import type { Publication } from "@/hooks/useProfile";

interface PublicationsFormProps {
  publications: Publication[];
  onAdd: (data: Omit<Publication, "id" | "user_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (id: string, data: Partial<Publication>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface FormData {
  typ: string;
  titel: string;
  journal_ort: string;
  datum: Date | null;
  beschreibung: string;
}

const PUBLIKATIONS_TYPEN = [
  "Publikation",
  "Kongress",
  "Poster",
  "Vortrag",
  "Doktorarbeit",
  "Buchkapitel",
  "Abstract"
];

const emptyFormData: FormData = {
  typ: "",
  titel: "",
  journal_ort: "",
  datum: null,
  beschreibung: ""
};

const PublicationsForm = ({ publications, onAdd, onUpdate, onDelete }: PublicationsFormProps) => {
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  const handleEdit = (pub: Publication) => {
    try {
      setFormData({
        typ: pub.typ || "",
        titel: pub.titel || "",
        journal_ort: pub.journal_ort || "",
        datum: pub.datum ? new Date(pub.datum) : null,
        beschreibung: pub.beschreibung || ""
      });
      setEditingId(pub.id);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error editing publication:", error);
      toast({
        title: "Fehler",
        description: "Publikation konnte nicht geladen werden.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.titel?.trim()) {
      toast({
        title: "Fehler",
        description: "Bitte geben Sie einen Titel ein.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const data = {
        typ: formData.typ || null,
        titel: formData.titel.trim(),
        journal_ort: formData.journal_ort?.trim() || null,
        datum: formData.datum ? toLocalDateString(formData.datum) : null,
        beschreibung: formData.beschreibung?.trim() || null
      };

      if (editingId) {
        await onUpdate(editingId, data);
      } else {
        await onAdd(data);
      }

      setFormData(emptyFormData);
      setEditingId(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error saving publication:", error);
      toast({
        title: "Fehler",
        description: "Publikation konnte nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await onDelete(id);
    } catch (error) {
      console.error("Error deleting publication:", error);
      toast({
        title: "Fehler",
        description: "Publikation konnte nicht gelöscht werden.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
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
              <BookOpen className="h-5 w-5" />
              Wissenschaft & Publikationen
            </CardTitle>
            <CardDescription>
              Veröffentlichungen, Kongresse, Vorträge und Doktorarbeit
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
                  {editingId ? "Publikation bearbeiten" : "Neue Publikation"}
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
                      {PUBLIKATIONS_TYPEN.map((typ) => (
                        <SelectItem key={typ} value={typ}>
                          {typ}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titel">Titel *</Label>
                  <Input
                    id="titel"
                    value={formData.titel}
                    onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
                    placeholder="Titel der Publikation / des Vortrags"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="journal_ort">Journal / Ort</Label>
                  <Input
                    id="journal_ort"
                    value={formData.journal_ort}
                    onChange={(e) => setFormData({ ...formData, journal_ort: e.target.value })}
                    placeholder="z.B. NEJM, DGIM Kongress Berlin"
                  />
                </div>
                <MonthYearPicker
                  label="Datum"
                  value={formData.datum}
                  onChange={(date) => setFormData({ ...formData, datum: date })}
                />
                <div className="space-y-2">
                  <Label htmlFor="beschreibung">Beschreibung (optional)</Label>
                  <Textarea
                    id="beschreibung"
                    value={formData.beschreibung}
                    onChange={(e) => setFormData({ ...formData, beschreibung: e.target.value })}
                    placeholder="Kurze Beschreibung oder Abstract..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" onClick={handleClose}>Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleSubmit} disabled={!formData.titel?.trim() || isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    "Speichern"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {publications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Noch keine Publikationen hinzugefügt.
          </p>
        ) : (
          <div className="space-y-4">
            {publications.map((pub) => (
              <div key={pub.id} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{pub.titel}</h4>
                      {pub.typ && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {pub.typ}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground flex flex-wrap gap-2">
                      {pub.journal_ort && <span>{pub.journal_ort}</span>}
                      {pub.datum && <span>• {format(new Date(pub.datum), "MM/yyyy")}</span>}
                    </div>
                    {pub.beschreibung && (
                      <p className="text-sm mt-2 whitespace-pre-wrap">{pub.beschreibung}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => handleEdit(pub)} disabled={isSaving}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9" onClick={() => handleDelete(pub.id)} disabled={isDeleting === pub.id}>
                      {isDeleting === pub.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
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

export default PublicationsForm;

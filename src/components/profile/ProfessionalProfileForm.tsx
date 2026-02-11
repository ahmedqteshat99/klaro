import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Save } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

interface ProfessionalProfileFormProps {
  profile: Profile | null;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isLoading?: boolean;
}

const FACHRICHTUNGEN = [
  "Allgemeinmedizin",
  "Anästhesiologie",
  "Anatomie",
  "Arbeitsmedizin",
  "Augenheilkunde",
  "Biochemie",
  "Chirurgie",
  "Dermatologie",
  "Frauenheilkunde und Geburtshilfe",
  "Gefäßchirurgie",
  "Herzchirurgie",
  "HNO-Heilkunde",
  "Humangenetik",
  "Hygiene und Umweltmedizin",
  "Innere Medizin",
  "Innere Medizin und Angiologie",
  "Innere Medizin und Endokrinologie",
  "Innere Medizin und Gastroenterologie",
  "Innere Medizin und Hämatologie/Onkologie",
  "Innere Medizin und Kardiologie",
  "Innere Medizin und Nephrologie",
  "Innere Medizin und Pneumologie",
  "Innere Medizin und Rheumatologie",
  "Kinder- und Jugendmedizin",
  "Kinder- und Jugendpsychiatrie",
  "Kinderchirurgie",
  "Laboratoriumsmedizin",
  "Mikrobiologie",
  "Mund-Kiefer-Gesichtschirurgie",
  "Neurochirurgie",
  "Neurologie",
  "Nuklearmedizin",
  "Öffentliches Gesundheitswesen",
  "Orthopädie und Unfallchirurgie",
  "Pathologie",
  "Pharmakologie",
  "Physikalische und Rehabilitative Medizin",
  "Physiologie",
  "Plastische Chirurgie",
  "Psychiatrie und Psychotherapie",
  "Psychosomatische Medizin",
  "Radiologie",
  "Rechtsmedizin",
  "Strahlentherapie",
  "Thoraxchirurgie",
  "Transfusionsmedizin",
  "Urologie",
  "Viszeralchirurgie"
];

const APPROBATIONSSTATUS = [
  "Approbation vorhanden",
  "Berufserlaubnis vorhanden",
  "Approbation beantragt",
  "In Vorbereitung"
];

const DEUTSCHNIVEAU = ["B1", "B2", "C1", "C2", "Muttersprache"];

const ProfessionalProfileForm = ({ profile, onSave, isLoading }: ProfessionalProfileFormProps) => {
  const [formData, setFormData] = useState({
    fachrichtung: "",
    approbationsstatus: "",
    deutschniveau: "",
    berufserfahrung_jahre: 0,
    cv_text: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        fachrichtung: profile.fachrichtung || "",
        approbationsstatus: profile.approbationsstatus || "",
        deutschniveau: profile.deutschniveau || "",
        berufserfahrung_jahre: profile.berufserfahrung_jahre || 0,
        cv_text: profile.cv_text || ""
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Berufliches Profil
        </CardTitle>
        <CardDescription>
          Ihre medizinische Qualifikation und Spezialisierung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fachrichtung</Label>
            <Select
              value={formData.fachrichtung}
              onValueChange={(value) => setFormData({ ...formData, fachrichtung: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fachrichtung auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {FACHRICHTUNGEN.map((fach) => (
                  <SelectItem key={fach} value={fach}>
                    {fach}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Approbationsstatus</Label>
            <Select
              value={formData.approbationsstatus}
              onValueChange={(value) => setFormData({ ...formData, approbationsstatus: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {APPROBATIONSSTATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Deutschniveau</Label>
            <Select
              value={formData.deutschniveau}
              onValueChange={(value) => setFormData({ ...formData, deutschniveau: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Niveau auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {DEUTSCHNIVEAU.map((niveau) => (
                  <SelectItem key={niveau} value={niveau}>
                    {niveau}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="berufserfahrung">Berufserfahrung (Jahre)</Label>
            <Input
              id="berufserfahrung"
              type="number"
              min="0"
              max="50"
              value={formData.berufserfahrung_jahre}
              onChange={(e) => setFormData({ ...formData, berufserfahrung_jahre: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cv_text">Bestehender CV-Text (optional)</Label>
          <Textarea
            id="cv_text"
            value={formData.cv_text}
            onChange={(e) => setFormData({ ...formData, cv_text: e.target.value })}
            placeholder="Falls Sie bereits einen Lebenslauf haben, können Sie den Text hier einfügen..."
            rows={4}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalProfileForm;

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";
import AutoSaveIndicator from "@/components/profile/AutoSaveIndicator";
import HelpTooltip from "@/components/profile/HelpTooltip";
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
    berufserfahrung_monate: 0,
    cv_text: ""
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fachrichtung: profile.fachrichtung || "",
        approbationsstatus: profile.approbationsstatus || "",
        deutschniveau: profile.deutschniveau || "",
        berufserfahrung_jahre: profile.berufserfahrung_jahre || 0,
        berufserfahrung_monate: profile.berufserfahrung_monate || 0,
        cv_text: profile.cv_text || ""
      });
    }
  }, [profile]);

  const { saveStatus } = useAutoSave({
    data: formData,
    onSave,
    enabled: !isLoading && !!profile,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Berufliches Profil
          </CardTitle>
          <AutoSaveIndicator status={saveStatus} />
        </div>
        <CardDescription>
          Ihre medizinische Qualifikation und Spezialisierung
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Fachrichtung
              <HelpTooltip text="Wählen Sie die Fachrichtung, in der Sie Ihre Weiterbildung absolvieren oder planen." />
            </Label>
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
            <Label className="flex items-center gap-1">
              Approbationsstatus
              <HelpTooltip text="Geben Sie an, ob Sie bereits eine ärztliche Approbation oder eine Berufserlaubnis besitzen." />
            </Label>
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

        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Deutschniveau
            <HelpTooltip text="Ihr aktuelles Sprachniveau nach dem Gemeinsamen Europäischen Referenzrahmen (GER). Für die ärztliche Tätigkeit in Deutschland wird i.d.R. mindestens B2/C1 gefordert." />
          </Label>
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
          <Label>Berufserfahrung</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="berufserfahrung_jahre" className="text-sm text-muted-foreground">Jahre</Label>
              <Input
                id="berufserfahrung_jahre"
                type="number"
                min="0"
                max="50"
                value={formData.berufserfahrung_jahre}
                onChange={(e) => setFormData({ ...formData, berufserfahrung_jahre: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="berufserfahrung_monate" className="text-sm text-muted-foreground">Monate</Label>
              <Input
                id="berufserfahrung_monate"
                type="number"
                min="0"
                max="11"
                value={formData.berufserfahrung_monate}
                onChange={(e) => setFormData({ ...formData, berufserfahrung_monate: parseInt(e.target.value) || 0 })}
              />
            </div>
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
      </CardContent>
    </Card>
  );
};

export default ProfessionalProfileForm;

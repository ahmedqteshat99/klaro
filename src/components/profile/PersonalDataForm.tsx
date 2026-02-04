import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Save, User } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

interface PersonalDataFormProps {
  profile: Profile | null;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isLoading?: boolean;
}

const FAMILIENSTAND_OPTIONS = [
  "Ledig",
  "Verheiratet",
  "Geschieden",
  "Verwitwet",
  "In Partnerschaft"
];

const PersonalDataForm = ({ profile, onSave, isLoading }: PersonalDataFormProps) => {
  const [formData, setFormData] = useState({
    vorname: "",
    nachname: "",
    geburtsdatum: null as Date | null,
    staatsangehoerigkeit: "",
    familienstand: "",
    stadt: "",
    email: "",
    telefon: ""
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        vorname: profile.vorname || "",
        nachname: profile.nachname || "",
        geburtsdatum: profile.geburtsdatum ? new Date(profile.geburtsdatum) : null,
        staatsangehoerigkeit: profile.staatsangehoerigkeit || "",
        familienstand: profile.familienstand || "",
        stadt: profile.stadt || "",
        email: profile.email || "",
        telefon: profile.telefon || ""
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      ...formData,
      geburtsdatum: formData.geburtsdatum?.toISOString().split("T")[0] || null
    });
    setIsSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          Persönliche Daten
        </CardTitle>
        <CardDescription>
          Grundlegende Informationen für Ihren Lebenslauf
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="vorname">Vorname *</Label>
            <Input
              id="vorname"
              value={formData.vorname}
              onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
              placeholder="Max"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname">Nachname *</Label>
            <Input
              id="nachname"
              value={formData.nachname}
              onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
              placeholder="Mustermann"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <DatePicker
            label="Geburtsdatum"
            value={formData.geburtsdatum}
            onChange={(date) => setFormData({ ...formData, geburtsdatum: date })}
            minYear={1940}
            maxYear={new Date().getFullYear() - 18}
          />
          <div className="space-y-2">
            <Label htmlFor="staatsangehoerigkeit">Staatsangehörigkeit</Label>
            <Input
              id="staatsangehoerigkeit"
              value={formData.staatsangehoerigkeit}
              onChange={(e) => setFormData({ ...formData, staatsangehoerigkeit: e.target.value })}
              placeholder="Deutsch"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Familienstand</Label>
            <Select
              value={formData.familienstand}
              onValueChange={(value) => setFormData({ ...formData, familienstand: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {FAMILIENSTAND_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              value={formData.stadt}
              onChange={(e) => setFormData({ ...formData, stadt: e.target.value })}
              placeholder="Berlin"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="max.mustermann@email.de"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalDataForm;

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/DatePicker";
import { Copy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoSave } from "@/hooks/useAutoSave";
import AutoSaveIndicator from "@/components/profile/AutoSaveIndicator";
import HelpTooltip from "@/components/profile/HelpTooltip";
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

const parseDateString = (value?: string | null): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

  const [errors, setErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        vorname: profile.vorname || "",
        nachname: profile.nachname || "",
        geburtsdatum: parseDateString(profile.geburtsdatum),
        staatsangehoerigkeit: profile.staatsangehoerigkeit || "",
        familienstand: profile.familienstand || "",
        stadt: profile.stadt || "",
        email: profile.email || "",
        telefon: profile.telefon || ""
      });
    }
  }, [profile]);

  // Data to auto-save (serialize dates for comparison)
  const savePayload = useMemo(() => ({
    ...formData,
    geburtsdatum: formData.geburtsdatum ? toLocalDateString(formData.geburtsdatum) : null
  }), [formData]);

  const { saveStatus } = useAutoSave({
    data: savePayload,
    onSave,
    enabled: !isLoading && !!profile,
  });

  const handleBlur = (field: string, value: string) => {
    if ((field === "vorname" || field === "nachname") && !value.trim()) {
      setErrors((e) => ({ ...e, [field]: true }));
    } else {
      setErrors((e) => ({ ...e, [field]: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            Persönliche Daten
          </CardTitle>
          <AutoSaveIndicator status={saveStatus} />
        </div>
        <CardDescription>
          Grundlegende Informationen für Ihren Lebenslauf
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="vorname" className="flex items-center gap-1">
              Vorname *
              <HelpTooltip text="Ihr offizieller Vorname wie im Personalausweis." />
            </Label>
            <Input
              id="vorname"
              value={formData.vorname}
              onChange={(e) => setFormData({ ...formData, vorname: e.target.value })}
              onBlur={(e) => handleBlur("vorname", e.target.value)}
              placeholder="Max"
              className={errors.vorname ? "border-destructive" : ""}
            />
            {errors.vorname && (
              <p className="text-xs text-destructive">Pflichtfeld</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nachname" className="flex items-center gap-1">
              Nachname *
            </Label>
            <Input
              id="nachname"
              value={formData.nachname}
              onChange={(e) => setFormData({ ...formData, nachname: e.target.value })}
              onBlur={(e) => handleBlur("nachname", e.target.value)}
              placeholder="Mustermann"
              className={errors.nachname ? "border-destructive" : ""}
            />
            {errors.nachname && (
              <p className="text-xs text-destructive">Pflichtfeld</p>
            )}
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={formData.telefon}
              onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
        </div>

        {profile?.klaro_email ? (
          <div className="space-y-2">
            <Label>Klaro E-Mail (wird im Lebenslauf verwendet)</Label>
            <div className="flex items-center gap-2">
              <Input
                value={profile.klaro_email}
                readOnly
                className="bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  void navigator.clipboard.writeText(profile.klaro_email!);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Diese E-Mail wird automatisch in Ihrem Lebenslauf angezeigt, damit Krankenhaus-Antworten in Ihrer Inbox landen.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default PersonalDataForm;

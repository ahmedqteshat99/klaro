import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import type { CvReviewProfileState, ProfileFieldState } from "@/lib/types/cv-review";
import { PROFILE_FIELD_LABELS } from "@/lib/types/cv-review";

interface ProfileSectionProps {
  data: CvReviewProfileState | null;
  onChange: (data: CvReviewProfileState | null) => void;
}

export function ProfileSection({ data, onChange }: ProfileSectionProps) {
  if (!data) {
    return (
      <AccordionItem value="profile">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Persönliche Daten</span>
            <Badge variant="secondary">0</Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-muted-foreground text-center py-4">
            Keine persönlichen Daten erkannt.
          </p>
        </AccordionContent>
      </AccordionItem>
    );
  }

  const enabledCount = Object.values(data).filter(
    (field) => field.enabled && field.value != null &&
      (Array.isArray(field.value) ? field.value.length > 0 : true)
  ).length;

  const toggleField = (key: keyof CvReviewProfileState) => {
    onChange({
      ...data,
      [key]: { ...data[key], enabled: !data[key].enabled },
    });
  };

  const updateFieldValue = (key: keyof CvReviewProfileState, value: unknown) => {
    onChange({
      ...data,
      [key]: { ...data[key], value },
    });
  };

  const renderField = (key: keyof CvReviewProfileState) => {
    const field = data[key];
    if (field.value == null || (Array.isArray(field.value) && field.value.length === 0)) {
      return null;
    }

    const label = PROFILE_FIELD_LABELS[key as keyof typeof PROFILE_FIELD_LABELS] || key;

    // Handle array fields
    if (Array.isArray(field.value)) {
      return (
        <div key={key} className="flex items-start gap-3 py-2 border-b last:border-b-0">
          <Checkbox
            checked={field.enabled}
            onCheckedChange={() => toggleField(key)}
            className="mt-1"
          />
          <div className="flex-1">
            <label className="text-sm font-medium text-muted-foreground">{label}</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {(field.value as string[]).map((item, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Handle number fields
    if (typeof field.value === "number") {
      return (
        <div key={key} className="flex items-center gap-3 py-2 border-b last:border-b-0">
          <Checkbox
            checked={field.enabled}
            onCheckedChange={() => toggleField(key)}
          />
          <div className="flex-1 flex items-center gap-2">
            <label className="text-sm font-medium text-muted-foreground min-w-[140px]">{label}</label>
            <Input
              type="number"
              value={field.value}
              onChange={(e) => updateFieldValue(key, parseInt(e.target.value) || 0)}
              className="max-w-[100px] h-8"
            />
          </div>
        </div>
      );
    }

    // Handle string fields
    return (
      <div key={key} className="flex items-center gap-3 py-2 border-b last:border-b-0">
        <Checkbox
          checked={field.enabled}
          onCheckedChange={() => toggleField(key)}
        />
        <div className="flex-1 flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground min-w-[140px]">{label}</label>
          <Input
            value={String(field.value)}
            onChange={(e) => updateFieldValue(key, e.target.value)}
            className="h-8"
          />
        </div>
      </div>
    );
  };

  const fieldOrder: (keyof CvReviewProfileState)[] = [
    "vorname",
    "nachname",
    "email",
    "telefon",
    "stadt",
    "geburtsdatum",
    "staatsangehoerigkeit",
    "familienstand",
    "fachrichtung",
    "approbationsstatus",
    "deutschniveau",
    "berufserfahrung_jahre",
    "medizinische_kenntnisse",
    "edv_kenntnisse",
    "sprachkenntnisse",
    "interessen",
  ];

  return (
    <AccordionItem value="profile">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span>Persönliche Daten</span>
          <Badge variant="secondary">{enabledCount}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-1 px-1">
          {fieldOrder.map((key) => renderField(key))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

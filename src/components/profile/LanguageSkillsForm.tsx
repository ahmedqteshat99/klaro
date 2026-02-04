import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Plus, Trash2, Save } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

interface LanguageSkillsFormProps {
  profile: Profile | null;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isLoading?: boolean;
}

interface LanguageEntry {
  name: string;
  level: string;
}

const LANGUAGE_SUGGESTIONS = [
  "Deutsch", "Englisch", "Französisch", "Spanisch", "Italienisch", 
  "Portugiesisch", "Russisch", "Polnisch", "Türkisch", "Arabisch",
  "Chinesisch", "Japanisch", "Koreanisch", "Hindi", "Persisch",
  "Griechisch", "Rumänisch", "Niederländisch", "Schwedisch", "Tschechisch"
];

const LANGUAGE_LEVELS = [
  { value: "Muttersprache", label: "Muttersprache" },
  { value: "C2", label: "C2 – Annähernd muttersprachlich" },
  { value: "C1", label: "C1 – Fließend" },
  { value: "B2", label: "B2 – Selbstständig" },
  { value: "B1", label: "B1 – Fortgeschritten" },
  { value: "A2", label: "A2 – Grundkenntnisse" },
  { value: "A1", label: "A1 – Anfänger" },
];

// Parse existing sprachkenntnisse from "Deutsch (C1)" format
const parseLanguages = (sprachkenntnisse: string[] | null): LanguageEntry[] => {
  if (!sprachkenntnisse || sprachkenntnisse.length === 0) return [];
  
  return sprachkenntnisse.map((lang) => {
    const match = lang.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return { name: match[1].trim(), level: match[2].trim() };
    }
    // Handle legacy format without parentheses
    return { name: lang, level: "" };
  });
};

// Serialize to "Deutsch (C1)" format
const serializeLanguages = (languages: LanguageEntry[]): string[] => {
  return languages
    .filter((l) => l.name.trim())
    .map((l) => l.level ? `${l.name} (${l.level})` : l.name);
};

const LanguageSkillsForm = ({ profile, onSave, isLoading }: LanguageSkillsFormProps) => {
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      const parsed = parseLanguages(profile.sprachkenntnisse);
      setLanguages(parsed.length > 0 ? parsed : [{ name: "", level: "" }]);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      sprachkenntnisse: serializeLanguages(languages)
    });
    setIsSaving(false);
  };

  const addLanguage = () => {
    setLanguages([...languages, { name: "", level: "" }]);
  };

  const removeLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  const updateLanguage = (index: number, field: keyof LanguageEntry, value: string) => {
    const updated = [...languages];
    updated[index] = { ...updated[index], [field]: value };
    setLanguages(updated);

    if (field === "name") {
      const filtered = LANGUAGE_SUGGESTIONS.filter(
        (s) => s.toLowerCase().includes(value.toLowerCase()) && 
        !languages.some((l, i) => i !== index && l.name.toLowerCase() === s.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    }
  };

  const selectSuggestion = (index: number, suggestion: string) => {
    updateLanguage(index, "name", suggestion);
    setFilteredSuggestions([]);
    setFocusedIndex(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Languages className="h-5 w-5" />
          Sprachkenntnisse
        </CardTitle>
        <CardDescription>
          Ihre Sprachkenntnisse mit Niveau-Angabe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {languages.map((lang, index) => (
          <div key={index} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1 relative">
              <Label htmlFor={`lang-${index}`}>Sprache</Label>
              <Input
                id={`lang-${index}`}
                value={lang.name}
                onChange={(e) => updateLanguage(index, "name", e.target.value)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setTimeout(() => setFocusedIndex(null), 200)}
                placeholder="z.B. Deutsch"
              />
              {focusedIndex === index && filteredSuggestions.length > 0 && lang.name && (
                <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                  {filteredSuggestions.slice(0, 6).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={() => selectSuggestion(index, suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="w-[200px] space-y-1">
              <Label>Niveau</Label>
              <Select
                value={lang.level}
                onValueChange={(value) => updateLanguage(index, "level", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Niveau wählen" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {languages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeLanguage(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline" onClick={addLanguage} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Weitere Sprache hinzufügen
        </Button>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Speichern..." : "Speichern"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LanguageSkillsForm;

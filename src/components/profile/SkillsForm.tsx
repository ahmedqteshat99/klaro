import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Brain, Save, X, Plus } from "lucide-react";
import type { Profile } from "@/hooks/useProfile";

interface SkillsFormProps {
  profile: Profile | null;
  onSave: (data: Partial<Profile>) => Promise<void>;
  isLoading?: boolean;
}

const MEDIZINISCHE_VORSCHLAEGE = [
  "Sonographie", "EKG", "Blutentnahme", "Legen von Zugängen", "Wundversorgung",
  "Reanimation", "Endoskopie", "Punktionen", "Beatmung", "Katheteranlage"
];

const EDV_VORSCHLAEGE = [
  "ORBIS", "SAP", "Medico", "iMedOne", "CERNER", "CGM", "MS Office", "Epic"
];

const SkillsForm = ({ profile, onSave, isLoading }: SkillsFormProps) => {
  const [medizinische, setMedizinische] = useState<string[]>([]);
  const [edv, setEdv] = useState<string[]>([]);
  const [interessen, setInteressen] = useState("");
  const [newMed, setNewMed] = useState("");
  const [newEdv, setNewEdv] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setMedizinische(profile.medizinische_kenntnisse || []);
      setEdv(profile.edv_kenntnisse || []);
      setInteressen(profile.interessen || "");
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      medizinische_kenntnisse: medizinische,
      edv_kenntnisse: edv,
      interessen: interessen || null
    });
    setIsSaving(false);
  };

  const addItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string, setInput: React.Dispatch<React.SetStateAction<string>>) => {
    if (item.trim() && !list.includes(item.trim())) {
      setList([...list, item.trim()]);
      setInput("");
    }
  };

  const removeItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setList(list.filter(i => i !== item));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Kenntnisse & Fähigkeiten
        </CardTitle>
        <CardDescription>
          Ihre medizinischen und technischen Kompetenzen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Medizinische Kenntnisse */}
        <div className="space-y-3">
          <Label>Medizinische Kenntnisse</Label>
          <div className="flex gap-2">
            <Input
              value={newMed}
              onChange={(e) => setNewMed(e.target.value)}
              placeholder="z.B. Sonographie"
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem(medizinische, setMedizinische, newMed, setNewMed))}
            />
            <Button variant="outline" size="icon" onClick={() => addItem(medizinische, setMedizinische, newMed, setNewMed)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {medizinische.map((item) => (
              <Badge key={item} variant="secondary" className="gap-1 pr-1">
                {item}
                <button onClick={() => removeItem(medizinische, setMedizinische, item)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {MEDIZINISCHE_VORSCHLAEGE.filter(v => !medizinische.includes(v)).slice(0, 5).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground"
                onClick={() => setMedizinische([...medizinische, v])}
              >
                + {v}
              </Button>
            ))}
          </div>
        </div>

        {/* EDV-Kenntnisse */}
        <div className="space-y-3">
          <Label>EDV-Kenntnisse</Label>
          <div className="flex gap-2">
            <Input
              value={newEdv}
              onChange={(e) => setNewEdv(e.target.value)}
              placeholder="z.B. ORBIS, SAP"
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addItem(edv, setEdv, newEdv, setNewEdv))}
            />
            <Button variant="outline" size="icon" onClick={() => addItem(edv, setEdv, newEdv, setNewEdv)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {edv.map((item) => (
              <Badge key={item} variant="secondary" className="gap-1 pr-1">
                {item}
                <button onClick={() => removeItem(edv, setEdv, item)} className="ml-1 hover:bg-destructive/20 rounded-full p-0.5">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {EDV_VORSCHLAEGE.filter(v => !edv.includes(v)).slice(0, 5).map((v) => (
              <Button
                key={v}
                variant="ghost"
                size="sm"
                className="text-xs h-7 text-muted-foreground"
                onClick={() => setEdv([...edv, v])}
              >
                + {v}
              </Button>
            ))}
          </div>
        </div>

        {/* Interessen */}
        <div className="space-y-2">
          <Label htmlFor="interessen">Interessen (optional)</Label>
          <Textarea
            id="interessen"
            value={interessen}
            onChange={(e) => setInteressen(e.target.value)}
            placeholder="z.B. Medizinische Forschung, Sport, Reisen..."
            rows={2}
          />
        </div>

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

export default SkillsForm;

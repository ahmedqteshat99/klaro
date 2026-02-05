import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Folder, Plus, Pencil, Trash2, Settings } from "lucide-react";
import type { CustomSection, CustomSectionEntry } from "@/lib/types/cv-review";

interface CustomSectionFormProps {
  section: CustomSection;
  entries: CustomSectionEntry[];
  onUpdateSection: (id: string, data: { section_name?: string }) => void;
  onDeleteSection: (id: string) => void;
  onAddEntry: (
    sectionId: string,
    data: Omit<CustomSectionEntry, "id" | "section_id" | "user_id" | "created_at" | "updated_at">
  ) => void;
  onUpdateEntry: (
    id: string,
    data: Partial<Omit<CustomSectionEntry, "id" | "section_id" | "user_id" | "created_at" | "updated_at">>
  ) => void;
  onDeleteEntry: (id: string) => void;
}

interface EntryFormData {
  title: string;
  description: string;
  zeitraum_von: string;
  zeitraum_bis: string;
}

const emptyEntry: EntryFormData = {
  title: "",
  description: "",
  zeitraum_von: "",
  zeitraum_bis: "",
};

export function CustomSectionForm({
  section,
  entries,
  onUpdateSection,
  onDeleteSection,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}: CustomSectionFormProps) {
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [entryForm, setEntryForm] = useState<EntryFormData>(emptyEntry);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState(section.section_name);

  const resetEntryForm = () => {
    setEntryForm(emptyEntry);
    setEditingEntryId(null);
  };

  const handleEditEntry = (entry: CustomSectionEntry) => {
    setEntryForm({
      title: entry.title,
      description: entry.description || "",
      zeitraum_von: entry.zeitraum_von || "",
      zeitraum_bis: entry.zeitraum_bis || "",
    });
    setEditingEntryId(entry.id);
    setIsEntryDialogOpen(true);
  };

  const handleSubmitEntry = () => {
    const data = {
      title: entryForm.title.trim(),
      description: entryForm.description.trim() || null,
      datum: null,
      zeitraum_von: entryForm.zeitraum_von || null,
      zeitraum_bis: entryForm.zeitraum_bis || null,
    };

    if (editingEntryId) {
      onUpdateEntry(editingEntryId, data);
    } else {
      onAddEntry(section.id, data);
    }

    setIsEntryDialogOpen(false);
    resetEntryForm();
  };

  const handleSaveSettings = () => {
    if (sectionName.trim() && sectionName !== section.section_name) {
      onUpdateSection(section.id, { section_name: sectionName.trim() });
    }
    setIsSettingsDialogOpen(false);
  };

  const formatDateRange = (von?: string | null, bis?: string | null) => {
    if (!von && !bis) return "";
    const formatDate = (d: string) => {
      const [year, month] = d.split("-");
      return `${month}/${year}`;
    };
    const vonStr = von ? formatDate(von) : "";
    const bisStr = bis ? formatDate(bis) : "heute";
    return `${vonStr} - ${bisStr}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Folder className="h-5 w-5" />
          {section.section_name}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Sektion bearbeiten</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="section-name">Sektionsname</Label>
                  <Input
                    id="section-name"
                    value={sectionName}
                    onChange={(e) => setSectionName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter className="flex justify-between">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Sektion löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Diese Aktion kann nicht rückgängig gemacht werden. Alle Einträge in dieser
                        Sektion werden ebenfalls gelöscht.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteSection(section.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button variant="outline">Abbrechen</Button>
                  </DialogClose>
                  <Button onClick={handleSaveSettings}>Speichern</Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isEntryDialogOpen} onOpenChange={(open) => {
            setIsEntryDialogOpen(open);
            if (!open) resetEntryForm();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetEntryForm}>
                <Plus className="mr-2 h-4 w-4" />
                Hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingEntryId ? "Eintrag bearbeiten" : "Eintrag hinzufügen"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="entry-title">Titel *</Label>
                  <Input
                    id="entry-title"
                    value={entryForm.title}
                    onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                    placeholder="Titel des Eintrags"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry-von">Von (YYYY-MM-DD)</Label>
                    <Input
                      id="entry-von"
                      value={entryForm.zeitraum_von}
                      onChange={(e) => setEntryForm({ ...entryForm, zeitraum_von: e.target.value })}
                      placeholder="2020-01-01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entry-bis">Bis (YYYY-MM-DD)</Label>
                    <Input
                      id="entry-bis"
                      value={entryForm.zeitraum_bis}
                      onChange={(e) => setEntryForm({ ...entryForm, zeitraum_bis: e.target.value })}
                      placeholder="2022-12-31"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entry-description">Beschreibung</Label>
                  <Textarea
                    id="entry-description"
                    value={entryForm.description}
                    onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                    placeholder="Optionale Beschreibung"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Abbrechen</Button>
                </DialogClose>
                <Button onClick={handleSubmitEntry} disabled={!entryForm.title.trim()}>
                  {editingEntryId ? "Speichern" : "Hinzufügen"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            Noch keine Einträge vorhanden.
          </p>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{entry.title}</h4>
                  {(entry.zeitraum_von || entry.zeitraum_bis) && (
                    <p className="text-sm text-muted-foreground">
                      {formatDateRange(entry.zeitraum_von, entry.zeitraum_bis)}
                    </p>
                  )}
                  {entry.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {entry.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEditEntry(entry)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eintrag löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchten Sie diesen Eintrag wirklich löschen?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteEntry(entry.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

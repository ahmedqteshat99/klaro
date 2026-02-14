import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { extractJobData, type JobData } from "@/lib/api/generation";
import {
  ADMIN_IMPORT_FIELD_LABELS,
  mapExtractedJobToAdminForm,
  type AdminJobFormValues,
} from "@/lib/job-import";
import { ExternalLink, Info, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

interface JobFormState {
  title: string;
  hospital_name: string;
  department: string;
  location: string;
  description: string;
  requirements: string;
  contact_email: string;
  contact_name: string;
  apply_url: string;
  tags: string;
  expires_at: string;
  is_published: boolean;
}

const defaultFormState: JobFormState = {
  title: "",
  hospital_name: "",
  department: "",
  location: "",
  description: "",
  requirements: "",
  contact_email: "",
  contact_name: "",
  apply_url: "",
  tags: "",
  expires_at: "",
  is_published: false,
};

const getImportableFormValues = (form: JobFormState): AdminJobFormValues => ({
  title: form.title,
  hospital_name: form.hospital_name,
  department: form.department,
  location: form.location,
  description: form.description,
  requirements: form.requirements,
  contact_email: form.contact_email,
  contact_name: form.contact_name,
  apply_url: form.apply_url,
  tags: form.tags,
});

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const tagsToString = (tags: string[] | null) => (tags && tags.length ? tags.join(", ") : "");

const parseTags = (value: string) => {
  const parsed = value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : null;
};

const toNullable = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const mapJobToForm = (job: Tables<"jobs">): JobFormState => ({
  title: job.title,
  hospital_name: job.hospital_name ?? "",
  department: job.department ?? "",
  location: job.location ?? "",
  description: job.description ?? "",
  requirements: job.requirements ?? "",
  contact_email: job.contact_email ?? "",
  contact_name: job.contact_name ?? "",
  apply_url: job.apply_url ?? "",
  tags: tagsToString(job.tags),
  expires_at: job.expires_at ?? "",
  is_published: job.is_published,
});

const AdminJobsPage = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Tables<"jobs">[]>([]);
  const [form, setForm] = useState<JobFormState>(defaultFormState);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyJobId, setBusyJobId] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState("");
  const [importText, setImportText] = useState("");
  const [overwriteImportedValues, setOverwriteImportedValues] = useState(false);
  const [isImportingFromUrl, setIsImportingFromUrl] = useState(false);
  const [isImportingFromText, setIsImportingFromText] = useState(false);
  const [importedFields, setImportedFields] = useState<Array<keyof AdminJobFormValues>>([]);
  const [missingFields, setMissingFields] = useState<Array<keyof AdminJobFormValues>>([]);
  const [lastImportSource, setLastImportSource] = useState<"url" | "text" | null>(null);

  const loadJobs = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Fehler",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setJobs(data ?? []);
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const editingJob = useMemo(
    () => (editingJobId ? jobs.find((job) => job.id === editingJobId) ?? null : null),
    [editingJobId, jobs]
  );

  const resetForm = () => {
    setEditingJobId(null);
    setForm(defaultFormState);
    setImportUrl("");
    setImportText("");
    setImportedFields([]);
    setMissingFields([]);
    setLastImportSource(null);
  };

  const startEdit = (job: Tables<"jobs">) => {
    setEditingJobId(job.id);
    setForm(mapJobToForm(job));
    setImportedFields([]);
    setMissingFields([]);
    setLastImportSource(null);
    setImportUrl(job.apply_url ?? "");
    setImportText("");
  };

  const applyImportedValues = (extracted: JobData, source: "url" | "text", sourceUrl?: string) => {
    const mapping = mapExtractedJobToAdminForm({
      currentForm: getImportableFormValues(form),
      extracted,
      sourceUrl,
      overwriteExisting: overwriteImportedValues,
    });

    setForm((prev) => ({
      ...prev,
      ...mapping.nextForm,
    }));
    setImportedFields(mapping.importedFields);
    setMissingFields(mapping.missingFields);
    setLastImportSource(source);

    return mapping;
  };

  const handleImportFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) {
      toast({
        title: "Link fehlt",
        description: "Bitte fügen Sie einen Job-Link ein.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingFromUrl(true);
    try {
      const result = await extractJobData({ url });
      if (!result.success || !result.data) {
        throw new Error(result.error || "Import konnte nicht durchgeführt werden.");
      }

      const mapping = applyImportedValues(result.data, "url", url);
      if (mapping.importedFields.length === 0) {
        toast({
          title: "Keine neuen Felder übernommen",
          description: "Alle importierten Werte waren bereits belegt oder leer.",
        });
      } else {
        toast({
          title: "Jobdetails importiert",
          description: `${mapping.importedFields.length} Felder wurden automatisch befüllt.`,
        });
      }
    } catch (error) {
      toast({
        title: "Import fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsImportingFromUrl(false);
    }
  };

  const handleImportFromText = async () => {
    const rawText = importText.trim();
    if (!rawText) {
      toast({
        title: "Text fehlt",
        description: "Bitte fügen Sie den Stellenanzeigentext ein.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingFromText(true);
    try {
      const result = await extractJobData({ rawText });
      if (!result.success || !result.data) {
        throw new Error(result.error || "Import konnte nicht durchgeführt werden.");
      }

      const mapping = applyImportedValues(result.data, "text", importUrl.trim());
      if (mapping.importedFields.length === 0) {
        toast({
          title: "Keine neuen Felder übernommen",
          description: "Alle importierten Werte waren bereits belegt oder leer.",
        });
      } else {
        toast({
          title: "Jobdetails importiert",
          description: `${mapping.importedFields.length} Felder wurden automatisch befüllt.`,
        });
      }
    } catch (error) {
      toast({
        title: "Import fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsImportingFromText(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast({
        title: "Titel fehlt",
        description: "Bitte geben Sie einen Jobtitel ein.",
        variant: "destructive",
      });
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      toast({
        title: "Nicht angemeldet",
        description: "Bitte neu anmelden.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const isPublishingNow =
      form.is_published && (!editingJob || !editingJob.is_published || !editingJob.published_at);

    const commonPayload: TablesUpdate<"jobs"> = {
      title: form.title.trim(),
      hospital_name: toNullable(form.hospital_name),
      department: toNullable(form.department),
      location: toNullable(form.location),
      description: toNullable(form.description),
      requirements: toNullable(form.requirements),
      contact_email: toNullable(form.contact_email),
      contact_name: toNullable(form.contact_name),
      apply_url: toNullable(form.apply_url),
      tags: parseTags(form.tags),
      expires_at: form.expires_at || null,
      is_published: form.is_published,
      published_at: form.is_published
        ? isPublishingNow
          ? new Date().toISOString()
          : editingJob?.published_at ?? new Date().toISOString()
        : null,
    };

    const response = editingJobId
      ? await supabase.from("jobs").update(commonPayload).eq("id", editingJobId)
      : await supabase.from("jobs").insert({
        ...(commonPayload as TablesInsert<"jobs">),
        created_by: userId,
      });

    setIsSaving(false);

    if (response.error) {
      toast({
        title: "Speichern fehlgeschlagen",
        description: response.error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: editingJobId ? "Job aktualisiert" : "Job erstellt",
      description: form.is_published
        ? "Der Job ist veröffentlicht und für Nutzer sichtbar."
        : "Der Job wurde als Entwurf gespeichert.",
    });

    resetForm();
    void loadJobs();
  };

  const handleTogglePublish = async (job: Tables<"jobs">) => {
    setBusyJobId(job.id);

    const nextPublished = !job.is_published;
    const { error } = await supabase
      .from("jobs")
      .update({
        is_published: nextPublished,
        published_at: nextPublished ? job.published_at ?? new Date().toISOString() : null,
      })
      .eq("id", job.id);

    setBusyJobId(null);

    if (error) {
      toast({
        title: "Status konnte nicht geändert werden",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: nextPublished ? "Job veröffentlicht" : "Job deaktiviert",
      description: nextPublished
        ? "Der Job ist jetzt auf der Job-Seite sichtbar."
        : "Der Job ist nicht mehr öffentlich sichtbar.",
    });

    void loadJobs();
  };

  const handleDelete = async (jobId: string) => {
    setBusyJobId(jobId);
    const { error } = await supabase.from("jobs").delete().eq("id", jobId);
    setBusyJobId(null);

    if (error) {
      toast({
        title: "Löschen fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Job gelöscht", description: "Der Job wurde entfernt." });
    if (editingJobId === jobId) {
      resetForm();
    }
    void loadJobs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs verwalten</h1>
          <p className="text-sm text-muted-foreground">Stellen erstellen, aktualisieren und veröffentlichen.</p>
        </div>
        <Button type="button" variant="outline" onClick={resetForm}>
          <Plus className="mr-2 h-4 w-4" />
          Neuer Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingJob ? "Job bearbeiten" : "Neuen Job erstellen"}</CardTitle>
          <CardDescription>
            Nur veröffentlichte Jobs sind auf der Nutzerseite sichtbar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <Alert className="mb-2 border-yellow-500/50 bg-yellow-50/10 dark:bg-yellow-900/10">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle>Hinweis zum Urheberrecht</AlertTitle>
              <AlertDescription>
                Bitte beachten Sie beim Import von externen Anzeigen das Urheberrecht.
                Nutzen Sie diese Funktion verantwortungsvoll (z.B. nur Kernfakten importieren).
              </AlertDescription>
            </Alert>

            {/* Job import section */}
            {(
              <div className="rounded-lg border border-dashed p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Job per Link importieren
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Link einfügen und Felder automatisch befüllen. Danach alles prüfen und bei Bedarf korrigieren.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="import-overwrite"
                      checked={overwriteImportedValues}
                      onCheckedChange={setOverwriteImportedValues}
                    />
                    <Label htmlFor="import-overwrite" className="text-xs">
                      Bestehende Felder überschreiben
                    </Label>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="job-import-url">Link zur Stellenanzeige</Label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Input
                      id="job-import-url"
                      value={importUrl}
                      onChange={(event) => setImportUrl(event.target.value)}
                      placeholder="https://..."
                      inputMode="url"
                      type="url"
                    />
                    <Button
                      type="button"
                      onClick={handleImportFromUrl}
                      disabled={isImportingFromUrl || !importUrl.trim()}
                      className="md:w-auto"
                    >
                      {isImportingFromUrl ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Importieren
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="job-import-text">Fallback: Stellenanzeigentext einfügen</Label>
                  <Textarea
                    id="job-import-text"
                    value={importText}
                    onChange={(event) => setImportText(event.target.value)}
                    placeholder="Optional: Falls Link-Import fehlschlägt, hier den Anzeigentext einfügen."
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleImportFromText}
                      disabled={isImportingFromText || !importText.trim()}
                    >
                      {isImportingFromText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Text importieren
                    </Button>
                  </div>
                </div>

                {lastImportSource ? (
                  <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                    <p>
                      Letzter Import: {lastImportSource === "url" ? "über Link" : "über Text"}.
                    </p>
                    <p>
                      Übernommene Felder:{" "}
                      {importedFields.length > 0
                        ? importedFields.map((field) => ADMIN_IMPORT_FIELD_LABELS[field]).join(", ")
                        : "keine"}
                    </p>
                    <p>
                      Noch leer:{" "}
                      {missingFields.length > 0
                        ? missingFields.map((field) => ADMIN_IMPORT_FIELD_LABELS[field]).join(", ")
                        : "keine"}
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="job-title">Titel</Label>
              <Input
                id="job-title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Assistenzarzt (m/w/d) Innere Medizin"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="job-hospital">Krankenhaus</Label>
                <Input
                  id="job-hospital"
                  value={form.hospital_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, hospital_name: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-department">Fachabteilung</Label>
                <Input
                  id="job-department"
                  value={form.department}
                  onChange={(event) => setForm((prev) => ({ ...prev, department: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-location">Standort</Label>
                <Input
                  id="job-location"
                  value={form.location}
                  onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-expires">Ablaufdatum</Label>
                <Input
                  id="job-expires"
                  type="date"
                  value={form.expires_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="job-description">Beschreibung</Label>
              <Textarea
                id="job-description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Kurzbeschreibung der Stelle"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="job-requirements">Anforderungen</Label>
              <Textarea
                id="job-requirements"
                value={form.requirements}
                onChange={(event) => setForm((prev) => ({ ...prev, requirements: event.target.value }))}
                placeholder="Wichtige Anforderungen und Voraussetzungen"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="job-contact-email">Kontakt E-Mail</Label>
                <Input
                  id="job-contact-email"
                  type="email"
                  value={form.contact_email}
                  onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
                  placeholder="jobs@klinik.de"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-contact-name">Kontaktperson</Label>
                <Input
                  id="job-contact-name"
                  value={form.contact_name}
                  onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="job-apply-url">Externer Link zur Anzeige</Label>
                <Input
                  id="job-apply-url"
                  value={form.apply_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, apply_url: event.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="job-tags">Tags (kommagetrennt)</Label>
                <Input
                  id="job-tags"
                  value={form.tags}
                  onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                  placeholder="Innere Medizin, Vollzeit"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="job-published"
                checked={form.is_published}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_published: checked }))}
              />
              <Label htmlFor="job-published">Direkt veröffentlichen</Label>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingJob ? "Änderungen speichern" : "Job erstellen"}
              </Button>
              {editingJob ? (
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Abbrechen
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alle Jobs</CardTitle>
          <CardDescription>{jobs.length} Einträge</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Titel</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Veröffentlicht</TableHead>
                    <TableHead>Ablauf</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => {
                    const isBusy = busyJobId === job.id;
                    return (
                      <TableRow key={job.id}>
                        <TableCell>
                          <div className="font-medium">{job.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {[job.hospital_name, job.department, job.location].filter(Boolean).join(" | ") || "-"}
                          </div>
                        </TableCell>
                        <TableCell>{job.contact_email ?? "-"}</TableCell>
                        <TableCell>{job.is_published ? "Veröffentlicht" : "Entwurf"}</TableCell>
                        <TableCell>{formatDateTime(job.published_at)}</TableCell>
                        <TableCell>{job.expires_at || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(job)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Bearbeiten
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => handleTogglePublish(job)}
                            >
                              {isBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                              {job.is_published ? "Deaktivieren" : "Publizieren"}
                            </Button>
                            {job.apply_url ? (
                              <Button asChild type="button" size="sm" variant="outline">
                                <a href={job.apply_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                                  Anzeige
                                </a>
                              </Button>
                            ) : null}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" size="sm" variant="destructive" disabled={isBusy}>
                                  {isBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-2 h-3.5 w-3.5" />}
                                  Löschen
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Job löschen?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Diese Aktion entfernt den Job dauerhaft aus dem System.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => handleDelete(job.id)}
                                  >
                                    Löschen
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {jobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Noch keine Jobs vorhanden.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminJobsPage;

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { extractJobData, type JobData } from "@/lib/api/generation";
import {
  ADMIN_IMPORT_FIELD_LABELS,
  mapExtractedJobToAdminForm,
  type AdminJobFormValues,
} from "@/lib/job-import";
import { Check, ExternalLink, Info, Link2, LinkIcon, Loader2, Pencil, Plus, Rss, Search, Sparkles, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

// RSS Import Sources Configuration
const IMPORT_SOURCES = [
  { id: "stellenmarkt_medizin", label: "Stellenmarkt", icon: "📰" },
  { id: "aerzteblatt", label: "Ärzteblatt", icon: "📋" },
  { id: "praktischarzt", label: "PraktischArzt", icon: "⚕️" },
  { id: "medijobs", label: "MediJobs", icon: "💼" },
  { id: "xing", label: "XING", icon: "🔗" },
  { id: "ethimedis", label: "Ethimedis", icon: "🏥" },
] as const;

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
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isRssImporting, setIsRssImporting] = useState(false);
  const [rssDialogOpen, setRssDialogOpen] = useState(false);
  const [rssDialogState, setRssDialogState] = useState<"running" | "success" | "error">("running");
  const [rssDialogMessage, setRssDialogMessage] = useState("");
  const [rssDialogResults, setRssDialogResults] = useState<{
    imported?: number; updated?: number; skipped?: number; expired?: number; totalListings?: number;
  } | null>(null);
  const [isXingImporting, setIsXingImporting] = useState(false);
  const [xingDialogOpen, setXingDialogOpen] = useState(false);
  const [xingDialogState, setXingDialogState] = useState<"running" | "success" | "error">("running");
  const [xingDialogMessage, setXingDialogMessage] = useState("");
  const [xingDialogResults, setXingDialogResults] = useState<{
    imported?: number; updated?: number; skipped?: number; expired?: number; totalListings?: number;
  } | null>(null);
  const [isPraktischArztImporting, setIsPraktischArztImporting] = useState(false);
  const [praktischArztDialogOpen, setPraktischArztDialogOpen] = useState(false);
  const [praktischArztDialogState, setPraktischArztDialogState] = useState<"running" | "success" | "error">("running");
  const [praktischArztDialogMessage, setPraktischArztDialogMessage] = useState("");
  const [praktischArztDialogResults, setPraktischArztDialogResults] = useState<{
    imported?: number; updated?: number; skipped?: number; expired?: number; totalListings?: number;
  } | null>(null);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

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

  const handleBackfillDescriptions = async () => {
    setIsBackfilling(true);
    try {
      const { backfillJobDescriptions } = await import("@/lib/api/generation");
      const result = await backfillJobDescriptions();

      if (!result.success) {
        toast({
          title: "Backfill fehlgeschlagen",
          description: result.error || "Unbekannter Fehler",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Backfill abgeschlossen",
        description: result.message || `${result.updated || 0} Jobs aktualisiert`,
      });

      if (result.errors && result.errors.length > 0) {
        console.warn("Backfill errors:", result.errors);
      }

      // Reload jobs to show updated descriptions
      await loadJobs();
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleRssImport = async (source?: string) => {
    setIsRssImporting(true);
    setRssDialogState("running");

    // Customize message based on source
    const sourceName = source
      ? IMPORT_SOURCES.find(s => s.id === source)?.label || source
      : "allen Quellen";
    setRssDialogMessage(`Stellenangebote werden von ${sourceName} geladen...`);
    setRssDialogResults(null);
    setRssDialogOpen(true);

    try {
      const { triggerRssImport } = await import("@/lib/api/generation");
      const result = await triggerRssImport(source ? [source] : undefined);

      if (!result.success) {
        setRssDialogState("error");
        setRssDialogMessage(result.error || "Unbekannter Fehler");
        return;
      }

      setRssDialogState("success");
      setRssDialogResults({
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        expired: result.expired,
        totalListings: result.totalFeedItems,
      });
      setRssDialogMessage(
        result.imported || result.updated
          ? "Neue Stellen wurden erfolgreich importiert."
          : result.totalFeedItems
            ? `${result.totalFeedItems} Stellen gefunden, alle bereits in der Datenbank vorhanden.`
            : "Keine Stellen gefunden. Möglicherweise sind die Seiten nicht erreichbar."
      );

      await loadJobs();
    } catch (error) {
      setRssDialogState("error");
      setRssDialogMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setIsRssImporting(false);
    }
  };

  const handleXingImport = async () => {
    setIsXingImporting(true);
    setXingDialogState("running");
    setXingDialogMessage("Stellenangebote werden von XING geladen...");
    setXingDialogResults(null);
    setXingDialogOpen(true);

    try {
      const { triggerXingImport } = await import("@/lib/api/generation");
      const result = await triggerXingImport();

      if (!result.success) {
        setXingDialogState("error");
        setXingDialogMessage(result.error || "Unbekannter Fehler");
        return;
      }

      setXingDialogState("success");
      setXingDialogResults({
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        expired: result.expired,
        totalListings: result.totalFeedItems,
      });
      setXingDialogMessage(
        result.imported || result.updated
          ? "Neue XING Stellen wurden erfolgreich importiert."
          : result.totalFeedItems
            ? `${result.totalFeedItems} Stellen gefunden, alle bereits in der Datenbank vorhanden.`
            : "Keine XING Stellen gefunden. Möglicherweise ist die Seite nicht erreichbar."
      );

      await loadJobs();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
      const isTimeout = msg.includes("non-2xx") || msg.includes("timeout") || msg.includes("504");
      setXingDialogState("error");
      setXingDialogMessage(
        isTimeout
          ? "Die XING-Abfrage hat zu lange gedauert (Timeout). Bitte versuchen Sie es später erneut."
          : msg
      );
    } finally {
      setIsXingImporting(false);
    }
  };

  const handlePraktischArztImport = async () => {
    setIsPraktischArztImporting(true);
    setPraktischArztDialogState("running");
    setPraktischArztDialogMessage("Stellenangebote werden von PraktischArzt geladen...");
    setPraktischArztDialogResults(null);
    setPraktischArztDialogOpen(true);

    try {
      const { triggerPraktischArztImport } = await import("@/lib/api/generation");
      const result = await triggerPraktischArztImport();

      if (!result.success) {
        setPraktischArztDialogState("error");
        setPraktischArztDialogMessage(result.error || "Unbekannter Fehler");
        return;
      }

      setPraktischArztDialogState("success");
      setPraktischArztDialogResults({
        imported: result.imported,
        updated: result.updated,
        skipped: result.skipped,
        expired: result.expired,
        totalListings: result.totalFeedItems,
      });
      setPraktischArztDialogMessage(
        result.imported || result.updated
          ? "Neue PraktischArzt Stellen wurden erfolgreich importiert."
          : result.totalFeedItems
            ? `${result.totalFeedItems} Stellen gefunden, alle bereits in der Datenbank vorhanden.`
            : "Keine PraktischArzt Stellen gefunden. Möglicherweise ist die Seite nicht erreichbar."
      );

      await loadJobs();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unbekannter Fehler";
      setPraktischArztDialogState("error");
      setPraktischArztDialogMessage(msg);
    } finally {
      setIsPraktischArztImporting(false);
    }
  };

  const handleCheckStaleJobs = async () => {
    setIsCheckingLinks(true);
    try {
      const { checkStaleJobs } = await import("@/lib/api/generation");
      const result = await checkStaleJobs();

      if (!result.success) {
        toast({
          title: "Link-Prüfung fehlgeschlagen",
          description: result.error || "Unbekannter Fehler",
          variant: "destructive",
        });
        return;
      }

      const parts = [];
      if (result.checked) parts.push(`${result.checked} geprüft`);
      if (result.active) parts.push(`${result.active} aktiv`);
      if (result.stale) parts.push(`${result.stale} inaktiv`);
      if (result.errors) parts.push(`${result.errors} Fehler`);

      toast({
        title: "Link-Prüfung abgeschlossen",
        description: parts.join(", ") || "Keine Jobs zum Prüfen",
        variant: result.stale && result.stale > 0 ? "destructive" : "default",
      });

      await loadJobs();
    } catch (error) {
      toast({
        title: "Fehler",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsCheckingLinks(false);
    }
  };

  const handleBulkDeactivateStale = async () => {
    const staleJobs = jobs.filter((j) => (j as any).link_status === "stale" && j.is_published);
    if (staleJobs.length === 0) return;

    let deactivated = 0;
    for (const job of staleJobs) {
      const { error } = await supabase
        .from("jobs")
        .update({ is_published: false, published_at: null })
        .eq("id", job.id);
      if (!error) deactivated++;
    }

    toast({
      title: "Jobs deaktiviert",
      description: `${deactivated} Jobs mit inaktiven Links wurden deaktiviert.`,
    });
    await loadJobs();
  };

  const handleApproveJob = async (job: Tables<"jobs">) => {
    setBusyJobId(job.id);
    const { error } = await supabase
      .from("jobs")
      .update({
        import_status: "published",
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    setBusyJobId(null);

    if (error) {
      // Check if it's a duplicate constraint error
      if (error.message.includes("idx_jobs_unique_apply_url") ||
          error.message.includes("duplicate key")) {
        toast({
          title: "Duplikat erkannt",
          description: "Eine andere Stelle mit dieser URL ist bereits veröffentlicht. Bitte verwenden Sie den Filter 'Duplikate', um ähnliche Stellen zu finden.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Fehler beim Genehmigen", description: error.message, variant: "destructive" });
      }
      return;
    }
    toast({ title: "Job genehmigt", description: "Der Job ist jetzt öffentlich sichtbar." });
    void loadJobs();
  };

  const handleRejectJob = async (job: Tables<"jobs">) => {
    setBusyJobId(job.id);
    const { error } = await supabase
      .from("jobs")
      .update({
        import_status: "rejected",
        is_published: false,
      })
      .eq("id", job.id);
    setBusyJobId(null);

    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Job abgelehnt", description: "Der Job wurde als abgelehnt markiert." });
    void loadJobs();
  };

  const toggleSelectJob = (jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedJobIds.size === filteredJobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(filteredJobs.map((j) => j.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedJobIds.size === 0) return;
    setIsBulkProcessing(true);
    let count = 0;
    let duplicates = 0;
    let errors = 0;

    for (const jobId of selectedJobIds) {
      const { error } = await supabase
        .from("jobs")
        .update({
          import_status: "published",
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (!error) {
        count++;
      } else if (error.message.includes("idx_jobs_unique_apply_url") ||
                 error.message.includes("duplicate key")) {
        duplicates++;
      } else {
        errors++;
      }
    }

    setIsBulkProcessing(false);
    setSelectedJobIds(new Set());
    toast({
      title: "Massenfreigabe abgeschlossen",
      description: `${count} Jobs wurden veröffentlicht.${duplicates > 0 ? ` ${duplicates} Duplikate übersprungen.` : ''}${errors > 0 ? ` ${errors} Fehler aufgetreten.` : ''}`,
      variant: duplicates > 0 || errors > 0 ? "destructive" : "default",
    });
    void loadJobs();
  };

  const handleBulkDeactivate = async () => {
    if (selectedJobIds.size === 0) return;
    setIsBulkProcessing(true);
    let count = 0;
    for (const jobId of selectedJobIds) {
      const { error } = await supabase
        .from("jobs")
        .update({ is_published: false, published_at: null })
        .eq("id", jobId);
      if (!error) count++;
    }
    setIsBulkProcessing(false);
    setSelectedJobIds(new Set());
    toast({ title: "Jobs deaktiviert", description: `${count} Jobs wurden deaktiviert.` });
    void loadJobs();
  };

  const handleBulkDelete = async () => {
    if (selectedJobIds.size === 0) return;
    setIsBulkProcessing(true);
    let count = 0;
    for (const jobId of selectedJobIds) {
      const { error } = await supabase.from("jobs").delete().eq("id", jobId);
      if (!error) count++;
    }
    setIsBulkProcessing(false);
    setSelectedJobIds(new Set());
    toast({ title: "Jobs gelöscht", description: `${count} Jobs wurden entfernt.` });
    if (editingJobId && selectedJobIds.has(editingJobId)) resetForm();
    void loadJobs();
  };

  const getStatusBadge = (job: Tables<"jobs">) => {
    const status = (job as any).import_status as string | null;
    switch (status) {
      case "pending_review":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50/50">Ausstehend</Badge>;
      case "published":
        return <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50/50">Genehmigt</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50/50">Abgelehnt</Badge>;
      case "expired":
        return <Badge variant="outline" className="border-gray-400 text-gray-500 bg-gray-50/50">Abgelaufen</Badge>;
      default:
        return job.is_published
          ? <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50/50">Veröffentlicht</Badge>
          : <Badge variant="outline">Entwurf</Badge>;
    }
  };

  const getLinkStatusBadge = (job: Tables<"jobs">) => {
    const linkStatus = (job as any).link_status as string | null;
    switch (linkStatus) {
      case "active":
        return <Badge variant="outline" className="border-green-500 text-green-600 bg-green-50/50 text-xs">🟢 Aktiv</Badge>;
      case "stale":
        return <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50/50 text-xs">🔴 Inaktiv</Badge>;
      case "error":
        return <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50/50 text-xs">⚠️ Fehler</Badge>;
      case "unknown":
        return <Badge variant="outline" className="border-gray-400 text-gray-500 bg-gray-50/50 text-xs">❓ Unklar</Badge>;
      default:
        return <Badge variant="outline" className="text-xs text-muted-foreground">⚪ Ungeprüft</Badge>;
    }
  };

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    if (statusFilter === "draft") return jobs.filter((j) => !(j as any).import_status || (j as any).import_status === "manual");
    if (statusFilter === "stale_links") return jobs.filter((j) => (j as any).link_status === "stale");
    if (statusFilter === "error_links") return jobs.filter((j) => (j as any).link_status === "error");
    if (statusFilter === "duplicates") {
      // Show jobs that would fail approval due to duplicates
      const publishedHashes = new Set(
        jobs.filter(j => j.is_published && (j as any).apply_url_hash)
          .map(j => (j as any).apply_url_hash)
      );
      return jobs.filter((j) =>
        !j.is_published &&
        (j as any).apply_url_hash &&
        publishedHashes.has((j as any).apply_url_hash)
      );
    }
    return jobs.filter((j) => (j as any).import_status === statusFilter);
  }, [jobs, statusFilter]);

  // Clear selection when filter changes or jobs reload
  useEffect(() => {
    setSelectedJobIds(new Set());
  }, [statusFilter, jobs]);

  const staleCount = jobs.filter((j) => (j as any).link_status === "stale" && j.is_published).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs verwalten</h1>
          <p className="text-sm text-muted-foreground">Stellen erstellen, aktualisieren und veröffentlichen.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCheckStaleJobs}
            disabled={isCheckingLinks}
          >
            {isCheckingLinks ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Prüfe Links...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Links prüfen
              </>
            )}
          </Button>
          {/* Source-specific import buttons */}
          <div className="col-span-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {IMPORT_SOURCES.map((source) => (
              <Button
                key={source.id}
                type="button"
                variant="outline"
                onClick={() => handleRssImport(source.id)}
                disabled={isRssImporting}
                className="flex flex-col items-center gap-1 h-auto py-3"
              >
                <span className="text-xl">{source.icon}</span>
                <span className="text-xs">{source.label}</span>
              </Button>
            ))}
            {/* Import all sources button */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleRssImport()}
              disabled={isRssImporting}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              {isRssImporting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-xs">Importiere...</span>
                </>
              ) : (
                <>
                  <Rss className="h-5 w-5" />
                  <span className="text-xs">Alle</span>
                </>
              )}
            </Button>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleBackfillDescriptions}
            disabled={isBackfilling}
          >
            {isBackfilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generiere...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Beschreibungen
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={resetForm}>
            <Plus className="mr-2 h-4 w-4" />
            Neuer Job
          </Button>
        </div>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Alle Jobs</CardTitle>
              <CardDescription>{filteredJobs.length} von {jobs.length} Einträgen</CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="pending_review">Ausstehend</SelectItem>
                <SelectItem value="published">Genehmigt</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
                <SelectItem value="expired">Abgelaufen</SelectItem>
                <SelectItem value="draft">Manuell/Entwurf</SelectItem>
                <SelectItem value="duplicates">🔄 Duplikate</SelectItem>
                <SelectItem value="stale_links">🔴 Inaktive Links</SelectItem>
                <SelectItem value="error_links">⚠️ Fehlerhafte Links</SelectItem>
              </SelectContent>
            </Select>
            {statusFilter === "stale_links" && staleCount > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleBulkDeactivateStale}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Alle deaktivieren ({staleCount})
              </Button>
            )}
          </div>

          {/* Bulk action bar */}
          {selectedJobIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 p-3 mt-3">
              <span className="text-sm font-medium mr-1">
                {selectedJobIds.size} ausgewählt
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
                disabled={isBulkProcessing}
                onClick={handleBulkApprove}
              >
                {isBulkProcessing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                Genehmigen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isBulkProcessing}
                onClick={handleBulkDeactivate}
              >
                {isBulkProcessing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
                Deaktivieren
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={isBulkProcessing}
                  >
                    {isBulkProcessing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
                    Löschen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{selectedJobIds.size} Jobs löschen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Diese Aktion entfernt die ausgewählten Jobs dauerhaft aus dem System.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleBulkDelete}
                    >
                      {selectedJobIds.size} Jobs löschen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedJobIds(new Set())}
              >
                Auswahl aufheben
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredJobs.length > 0 && selectedJobIds.size === filteredJobs.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Alle auswählen"
                      />
                    </TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Quelle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead>Veröffentlicht</TableHead>
                    <TableHead>Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => {
                    const isBusy = busyJobId === job.id;
                    const importStatus = (job as any).import_status as string | null;
                    const isPending = importStatus === "pending_review";
                    const isRssJob = importStatus && importStatus !== "manual";
                    return (
                      <TableRow key={job.id} className={isPending ? "bg-yellow-50/30 dark:bg-yellow-900/10" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selectedJobIds.has(job.id)}
                            onCheckedChange={() => toggleSelectJob(job.id)}
                            aria-label={`${job.title} auswählen`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{job.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {[job.hospital_name, job.department, job.location].filter(Boolean).join(" | ") || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isRssJob ? (
                            (() => {
                              const feedSource = (job as any).rss_feed_source as string | null;
                              const sourceMap: Record<string, { name: string; color: string }> = {
                                'xing': { name: 'XING', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                                'stellenmarkt_medizin': { name: 'Stellenmarkt', color: 'bg-purple-100 text-purple-700 border-purple-200' },
                                'aerzteblatt': { name: 'Ärzteblatt', color: 'bg-green-100 text-green-700 border-green-200' },
                                'praktischarzt': { name: 'PraktischArzt', color: 'bg-orange-100 text-orange-700 border-orange-200' },
                                'medijobs': { name: 'MediJobs', color: 'bg-pink-100 text-pink-700 border-pink-200' },
                              };
                              const source = feedSource ? sourceMap[feedSource] : null;
                              return source ? (
                                <Badge variant="outline" className={`text-xs ${source.color}`}>
                                  <Rss className="h-3 w-3 mr-1" /> {source.name}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  <Rss className="h-3 w-3 mr-1" /> RSS
                                </Badge>
                              );
                            })()
                          ) : (
                            <span className="text-xs text-muted-foreground">Manuell</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(job)}</TableCell>
                        <TableCell>{getLinkStatusBadge(job)}</TableCell>
                        <TableCell>{formatDateTime(job.published_at)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {isPending && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  className="border-green-500 text-green-600 hover:bg-green-50"
                                  onClick={() => handleApproveJob(job)}
                                >
                                  {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                                  Genehmigen
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={isBusy}
                                  className="border-red-500 text-red-600 hover:bg-red-50"
                                  onClick={() => handleRejectJob(job)}
                                >
                                  {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <X className="mr-1 h-3.5 w-3.5" />}
                                  Ablehnen
                                </Button>
                              </>
                            )}
                            <Button type="button" size="sm" variant="outline" onClick={() => startEdit(job)}>
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Bearbeiten
                            </Button>
                            {!isPending && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isBusy}
                                onClick={() => handleTogglePublish(job)}
                              >
                                {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                                {job.is_published ? "Deaktivieren" : "Publizieren"}
                              </Button>
                            )}
                            {job.apply_url ? (
                              <Button asChild type="button" size="sm" variant="outline">
                                <a href={job.apply_url} target="_blank" rel="noreferrer">
                                  <ExternalLink className="mr-1 h-3.5 w-3.5" />
                                  Link
                                </a>
                              </Button>
                            ) : null}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button type="button" size="sm" variant="destructive" disabled={isBusy}>
                                  {isBusy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />}
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
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
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

      {/* RSS Import Progress Dialog */}
      <Dialog open={rssDialogOpen} onOpenChange={(open) => { if (!isRssImporting) setRssDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => { if (isRssImporting) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              RSS-Import
            </DialogTitle>
            <DialogDescription>
              {rssDialogState === "running"
                ? "Import läuft..."
                : rssDialogState === "success"
                  ? "Import abgeschlossen"
                  : "Import fehlgeschlagen"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {rssDialogState === "running" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  <p className="text-sm">{rssDialogMessage}</p>
                </div>
                <div className="space-y-2 pl-8 text-xs text-muted-foreground">
                  <p>Stellenmarkt.de, Ärzteblatt, PraktischArzt und MediJobs werden durchsucht</p>
                  <p>Arbeitgeber-Links werden aufgelöst</p>
                  <p>KI-Zusammenfassungen werden generiert</p>
                </div>
              </div>
            )}

            {rssDialogState === "success" && rssDialogResults && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm">{rssDialogMessage}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                  {rssDialogResults.imported != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{rssDialogResults.imported}</div>
                      <div className="text-xs text-muted-foreground">Neu importiert</div>
                    </div>
                  )}
                  {rssDialogResults.updated != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{rssDialogResults.updated}</div>
                      <div className="text-xs text-muted-foreground">Aktualisiert</div>
                    </div>
                  )}
                  {rssDialogResults.skipped != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">{rssDialogResults.skipped}</div>
                      <div className="text-xs text-muted-foreground">Übersprungen</div>
                    </div>
                  )}
                  {rssDialogResults.expired != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{rssDialogResults.expired}</div>
                      <div className="text-xs text-muted-foreground">Abgelaufen</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {rssDialogState === "success" && !rssDialogResults && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-sm">{rssDialogMessage}</p>
              </div>
            )}

            {rssDialogState === "error" && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-sm text-red-600">{rssDialogMessage}</p>
              </div>
            )}
          </div>

          {!isRssImporting && (
            <DialogFooter>
              <Button onClick={() => setRssDialogOpen(false)}>Schließen</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* XING Import Progress Dialog */}
      <Dialog open={xingDialogOpen} onOpenChange={(open) => { if (!isXingImporting) setXingDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => { if (isXingImporting) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-blue-600" />
              XING-Import
            </DialogTitle>
            <DialogDescription>
              {xingDialogState === "running"
                ? "Import läuft..."
                : xingDialogState === "success"
                  ? "Import abgeschlossen"
                  : "Import fehlgeschlagen"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {xingDialogState === "running" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
                  <p className="text-sm">{xingDialogMessage}</p>
                </div>
                <div className="space-y-2 pl-8 text-xs text-muted-foreground">
                  <p>XING Jobs werden durchsucht</p>
                  <p>Cloudflare-Schutz wird umgangen (Puppeteer)</p>
                  <p>KI-Zusammenfassungen werden generiert</p>
                </div>
              </div>
            )}

            {xingDialogState === "success" && xingDialogResults && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-sm">{xingDialogMessage}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-blue-200 p-3 bg-blue-50/50">
                  {xingDialogResults.imported != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{xingDialogResults.imported}</div>
                      <div className="text-xs text-muted-foreground">Neu importiert</div>
                    </div>
                  )}
                  {xingDialogResults.updated != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-500">{xingDialogResults.updated}</div>
                      <div className="text-xs text-muted-foreground">Aktualisiert</div>
                    </div>
                  )}
                  {xingDialogResults.skipped != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">{xingDialogResults.skipped}</div>
                      <div className="text-xs text-muted-foreground">Übersprungen</div>
                    </div>
                  )}
                  {xingDialogResults.expired != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{xingDialogResults.expired}</div>
                      <div className="text-xs text-muted-foreground">Abgelaufen</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {xingDialogState === "success" && !xingDialogResults && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                  <Check className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm">{xingDialogMessage}</p>
              </div>
            )}

            {xingDialogState === "error" && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-sm text-red-600">{xingDialogMessage}</p>
              </div>
            )}
          </div>

          {!isXingImporting && (
            <DialogFooter>
              <Button onClick={() => setXingDialogOpen(false)}>Schließen</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* PraktischArzt Import Progress Dialog */}
      <Dialog open={praktischArztDialogOpen} onOpenChange={(open) => { if (!isPraktischArztImporting) setPraktischArztDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => { if (isPraktischArztImporting) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-orange-600" />
              PraktischArzt-Import
            </DialogTitle>
            <DialogDescription>
              {praktischArztDialogState === "running"
                ? "Import läuft..."
                : praktischArztDialogState === "success"
                  ? "Import abgeschlossen"
                  : "Import fehlgeschlagen"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {praktischArztDialogState === "running" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-600 shrink-0" />
                  <p className="text-sm">{praktischArztDialogMessage}</p>
                </div>
                <div className="space-y-2 pl-8 text-xs text-muted-foreground">
                  <p>PraktischArzt Jobs werden durchsucht</p>
                  <p>Arbeitgeber-Links werden aufgelöst</p>
                  <p>KI-Zusammenfassungen werden generiert</p>
                </div>
              </div>
            )}

            {praktischArztDialogState === "success" && praktischArztDialogResults && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
                    <Check className="h-4 w-4 text-orange-600" />
                  </div>
                  <p className="text-sm">{praktischArztDialogMessage}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-lg border border-orange-200 p-3 bg-orange-50/50">
                  {praktischArztDialogResults.totalListings != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-700">{praktischArztDialogResults.totalListings}</div>
                      <div className="text-xs text-muted-foreground">Gefunden</div>
                    </div>
                  )}
                  {praktischArztDialogResults.imported != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{praktischArztDialogResults.imported}</div>
                      <div className="text-xs text-muted-foreground">Neu importiert</div>
                    </div>
                  )}
                  {praktischArztDialogResults.skipped != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-muted-foreground">{praktischArztDialogResults.skipped}</div>
                      <div className="text-xs text-muted-foreground">Bereits vorhanden</div>
                    </div>
                  )}
                  {praktischArztDialogResults.updated != null && (
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-500">{praktischArztDialogResults.updated}</div>
                      <div className="text-xs text-muted-foreground">Aktualisiert</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {praktischArztDialogState === "success" && !praktischArztDialogResults && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
                  <Check className="h-4 w-4 text-orange-600" />
                </div>
                <p className="text-sm">{praktischArztDialogMessage}</p>
              </div>
            )}

            {praktischArztDialogState === "error" && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
                  <X className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-sm text-red-600">{praktischArztDialogMessage}</p>
              </div>
            )}
          </div>

          {!isPraktischArztImporting && (
            <DialogFooter>
              <Button onClick={() => setPraktischArztDialogOpen(false)}>Schließen</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobsPage;

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  FileText,
  Trash2,
  Pencil,
  Check,
  X,
  FolderOpen,
  Building2,
  Filter,
  MessageSquare,
  CalendarClock,
  ChevronDown,
  AlertCircle
} from "lucide-react";
import { format, isPast, isToday, differenceInDays } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Application status configuration
const APPLICATION_STATUSES = {
  draft: { label: "Entwurf", color: "bg-gray-100 text-gray-700 border-gray-300" },
  applied: { label: "Beworben", color: "bg-blue-100 text-blue-700 border-blue-300" },
  interview: { label: "Einladung", color: "bg-green-100 text-green-700 border-green-300" },
  rejected: { label: "Absage", color: "bg-red-100 text-red-700 border-red-300" },
  offer: { label: "Angebot", color: "bg-amber-100 text-amber-700 border-amber-300" },
} as const;

type ApplicationStatus = keyof typeof APPLICATION_STATUSES;

interface DocumentVersion {
  id: string;
  name: string;
  typ: string;
  created_at: string;
  updated_at: string;
  hospital_name: string | null;
  department_or_specialty: string | null;
  position_title: string | null;
  job_url: string | null;
  applied: boolean | null;
  applied_date: string | null;
  application_status: ApplicationStatus | null;
  notes: string | null;
  followup_date: string | null;
  show_foto: boolean | null;
  show_signatur: boolean | null;
}

interface DocumentVersionsListProps {
  onLoadDocument: (html: string, type: "cv" | "anschreiben", createdAt?: string | null) => void;
  userId: string | null;
  refreshTrigger?: number;
}

const DocumentVersionsList = ({ onLoadDocument, userId, refreshTrigger }: DocumentVersionsListProps) => {
  const [documents, setDocuments] = useState<DocumentVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | ApplicationStatus>("all");
  const [sortBy, setSortBy] = useState<"newest" | "hospital" | "status">("newest");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!userId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("document_versions")
      .select("id, name, typ, created_at, updated_at, hospital_name, department_or_specialty, position_title, job_url, applied, applied_date, application_status, notes, followup_date, show_foto, show_signatur")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      toast({ title: "Fehler", description: "Dokumente konnten nicht geladen werden.", variant: "destructive" });
    } else {
      // Map old 'applied' field to application_status for backwards compatibility
      const mapped = (data || []).map((doc) => ({
        ...doc,
        application_status: doc.application_status || (doc.applied ? "applied" : "draft"),
      }));
      setDocuments(mapped as DocumentVersion[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId, refreshTrigger]);

  const loadDocumentContent = async (doc: DocumentVersion, type: "cv" | "anschreiben") => {
    if (!userId) return;
    setLoadingId(doc.id);

    const { data, error } = await supabase
      .from("document_versions")
      .select("html_content, created_at")
      .eq("id", doc.id)
      .maybeSingle();

    if (error || !data?.html_content) {
      console.error("Error loading document content:", error);
      toast({
        title: "Fehler",
        description: "Dokumentinhalt konnte nicht geladen werden.",
        variant: "destructive"
      });
    } else {
      onLoadDocument(data.html_content, type, data.created_at ?? doc.created_at);
    }

    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    // Store the document before removing from UI
    const deletedDoc = documents.find((d) => d.id === id);
    if (!deletedDoc) return;

    // Optimistically remove from UI
    setDocuments(documents.filter((d) => d.id !== id));

    // Create a timeout for actual deletion
    const timeoutId = setTimeout(async () => {
      const { error } = await supabase.from("document_versions").delete().eq("id", id);
      if (error) {
        // Restore if delete failed
        setDocuments((prev) => [...prev, deletedDoc]);
        toast({ title: "Fehler", description: "Dokument konnte nicht gelöscht werden.", variant: "destructive" });
      }
    }, 5000);

    // Show toast with undo option
    toast({
      title: "Dokument entfernt",
      description: "Das Dokument wurde entfernt.",
      action: (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearTimeout(timeoutId);
            setDocuments((prev) => [...prev, deletedDoc]);
            toast({ title: "Rückgängig", description: "Dokument wurde wiederhergestellt." });
          }}
        >
          Rückgängig
        </Button>
      ),
    });
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("document_versions")
      .update({ name: editName.trim() })
      .eq("id", id);

    if (error) {
      toast({ title: "Fehler", description: "Name konnte nicht geändert werden.", variant: "destructive" });
    } else {
      setDocuments(documents.map((d) => d.id === id ? { ...d, name: editName.trim() } : d));
      setEditingId(null);
      toast({ title: "Gespeichert", description: "Name wurde aktualisiert." });
    }
  };

  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    const update: Partial<DocumentVersion> = {
      application_status: newStatus,
      applied: newStatus !== "draft",
      applied_date: newStatus !== "draft" ? new Date().toISOString().split("T")[0] : null
    };

    const { error } = await supabase
      .from("document_versions")
      .update(update)
      .eq("id", id);

    if (error) {
      toast({ title: "Fehler", description: "Status konnte nicht geändert werden.", variant: "destructive" });
    } else {
      setDocuments(documents.map((d) => d.id === id ? { ...d, ...update } : d));
    }
  };

  const handleSaveNotes = async (id: string) => {
    const { error } = await supabase
      .from("document_versions")
      .update({ notes: editNotes.trim() || null })
      .eq("id", id);

    if (error) {
      toast({ title: "Fehler", description: "Notizen konnten nicht gespeichert werden.", variant: "destructive" });
    } else {
      setDocuments(documents.map((d) => d.id === id ? { ...d, notes: editNotes.trim() || null } : d));
      setEditingNotesId(null);
      toast({ title: "Gespeichert", description: "Notizen wurden aktualisiert." });
    }
  };

  const handleFollowupDate = async (id: string, date: Date | undefined) => {
    const followupDate = date ? format(date, "yyyy-MM-dd") : null;

    const { error } = await supabase
      .from("document_versions")
      .update({ followup_date: followupDate })
      .eq("id", id);

    if (error) {
      toast({ title: "Fehler", description: "Erinnerung konnte nicht gesetzt werden.", variant: "destructive" });
    } else {
      setDocuments(documents.map((d) => d.id === id ? { ...d, followup_date: followupDate } : d));
    }
  };

  const cvDocuments = documents.filter((d) => d.typ === "CV" || d.typ === "cv");
  const anschreibenDocuments = documents.filter((d) => d.typ === "Anschreiben" || d.typ === "anschreiben");

  // Statistics
  const stats = useMemo(() => {
    const counts = { draft: 0, applied: 0, interview: 0, rejected: 0, offer: 0 };
    anschreibenDocuments.forEach((d) => {
      const status = d.application_status || "draft";
      if (status in counts) counts[status as ApplicationStatus]++;
    });
    return counts;
  }, [anschreibenDocuments]);

  const filteredAnschreiben = anschreibenDocuments
    .filter((d) => {
      if (filterStatus === "all") return true;
      return d.application_status === filterStatus;
    })
    .sort((a, b) => {
      if (sortBy === "hospital") {
        return (a.hospital_name || "").localeCompare(b.hospital_name || "");
      }
      if (sortBy === "status") {
        const order = ["offer", "interview", "applied", "draft", "rejected"];
        return order.indexOf(a.application_status || "draft") - order.indexOf(b.application_status || "draft");
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const getFollowupStatus = (followupDate: string | null) => {
    if (!followupDate) return null;
    const date = new Date(followupDate);
    if (isPast(date) && !isToday(date)) return "overdue";
    if (isToday(date)) return "today";
    const daysUntil = differenceInDays(date, new Date());
    if (daysUntil <= 3) return "soon";
    return "future";
  };

  const renderStatusBadge = (status: ApplicationStatus) => {
    const config = APPLICATION_STATUSES[status];
    return (
      <Badge variant="outline" className={cn("text-xs font-medium border", config.color)}>
        {config.label}
      </Badge>
    );
  };

  const renderAnschreibenItem = (doc: DocumentVersion) => {
    const followupStatus = getFollowupStatus(doc.followup_date);

    return (
      <div key={doc.id} className="w-full border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors min-w-0">
        <div className="flex items-start gap-3 min-w-0">
          <Building2 className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />

          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: Hospital + Status */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {editingId === doc.id ? (
                  <div className="flex gap-2 items-center">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 w-full min-w-0"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRename(doc.id)}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="font-medium truncate block">{doc.hospital_name || doc.name}</span>
                    {doc.department_or_specialty && (
                      <span className="text-sm text-muted-foreground block truncate">
                        {doc.department_or_specialty}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {doc.position_title && <span className="truncate">{doc.position_title}</span>}
              <span>{format(new Date(doc.created_at), "dd.MM.yyyy", { locale: de })}</span>
              {doc.applied_date && (
                <span className="text-blue-600">
                  Beworben: {format(new Date(doc.applied_date), "dd.MM.yy", { locale: de })}
                </span>
              )}
            </div>

            {/* Followup reminder */}
            {followupStatus && doc.followup_date && (
              <div className={cn(
                "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md w-fit",
                followupStatus === "overdue" && "bg-red-100 text-red-700",
                followupStatus === "today" && "bg-amber-100 text-amber-700",
                followupStatus === "soon" && "bg-blue-100 text-blue-700",
                followupStatus === "future" && "bg-gray-100 text-gray-600"
              )}>
                <AlertCircle className="h-3 w-3" />
                {followupStatus === "overdue" && "Überfällig: "}
                {followupStatus === "today" && "Heute: "}
                {followupStatus === "soon" && "Bald: "}
                Nachfragen am {format(new Date(doc.followup_date), "dd.MM.yy", { locale: de })}
              </div>
            )}

            {/* Notes preview */}
            {doc.notes && editingNotesId !== doc.id && (
              <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 line-clamp-2">
                {doc.notes}
              </p>
            )}

            {/* Notes editing */}
            {editingNotesId === doc.id && (
              <div className="space-y-2">
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notizen hinzufügen..."
                  rows={3}
                  className="text-sm"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingNotesId(null)}>
                    Abbrechen
                  </Button>
                  <Button size="sm" onClick={() => handleSaveNotes(doc.id)}>
                    Speichern
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-3 pt-2 border-t space-y-2">
          {/* First row: Status + main actions */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Status dropdown - first button, highlighted */}
            <Select
              value={doc.application_status || "draft"}
              onValueChange={(v) => handleStatusChange(doc.id, v as ApplicationStatus)}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-auto gap-1 px-3 rounded-md border font-medium text-sm",
                  APPLICATION_STATUSES[doc.application_status || "draft"].color
                )}
              >
                {APPLICATION_STATUSES[doc.application_status || "draft"].label}
                <ChevronDown className="h-3 w-3 opacity-50" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPLICATION_STATUSES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", config.color.split(" ")[0])} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => loadDocumentContent(doc, "anschreiben")}
              disabled={loadingId === doc.id}
            >
              <FolderOpen className="h-4 w-4 mr-1" />
              Laden
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => { setEditingId(doc.id); setEditName(doc.name); }}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Name
            </Button>
          </div>

          {/* Second row: Secondary actions */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => { setEditingNotesId(doc.id); setEditNotes(doc.notes || ""); }}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                Notizen
              </Button>

              {/* Followup date picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2">
                    <CalendarClock className="h-4 w-4 mr-1" />
                    Erinnerung
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={doc.followup_date ? new Date(doc.followup_date) : undefined}
                    onSelect={(date) => handleFollowupDate(doc.id, date)}
                    locale={de}
                  />
                  {doc.followup_date && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-destructive"
                        onClick={() => handleFollowupDate(doc.id, undefined)}
                      >
                        Erinnerung entfernen
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(doc.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Entfernen
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCvItem = (doc: DocumentVersion) => (
    <div key={doc.id} className="w-full border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors min-w-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 min-w-0">
        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div className="min-w-0 overflow-hidden">
          {editingId === doc.id ? (
            <div className="flex gap-2 items-center">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-8 w-full min-w-0"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRename(doc.id)}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <span className="font-medium truncate block">{doc.name}</span>
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(doc.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={() => loadDocumentContent(doc, "cv")}
            title="Laden"
            disabled={loadingId === doc.id}
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={() => { setEditingId(doc.id); setEditName(doc.name); }}
            title="Umbenennen"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-8 sm:w-8"
            onClick={() => handleDelete(doc.id)}
            title="Entfernen"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meine Dokumente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Lade...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Meine Dokumente
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0">
        <Tabs defaultValue="anschreiben" className="min-w-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cv">
              Lebensläufe ({cvDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="anschreiben">
              Anschreiben ({anschreibenDocuments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cv" className="mt-4 min-w-0">
            <ScrollArea className="h-[50vh] sm:h-[300px] w-full min-w-0">
              {cvDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Lebensläufe gespeichert.
                </p>
              ) : (
                <div className="space-y-2 min-w-0">
                  {cvDocuments.map((doc) => renderCvItem(doc))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="anschreiben" className="mt-4 space-y-3 min-w-0">
            {/* Statistics Dashboard */}
            {anschreibenDocuments.length > 0 && (
              <div className="grid grid-cols-5 gap-2 p-3 bg-muted/30 rounded-lg border">
                {Object.entries(APPLICATION_STATUSES).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setFilterStatus(filterStatus === key ? "all" : key as ApplicationStatus)}
                    className={cn(
                      "flex flex-col items-center p-2 rounded-md transition-colors",
                      filterStatus === key ? "bg-background shadow-sm ring-1 ring-border" : "hover:bg-muted"
                    )}
                  >
                    <span className="text-lg font-semibold">{stats[key as ApplicationStatus]}</span>
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 items-center flex-wrap min-w-0">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                  <SelectTrigger className="w-full sm:w-[150px] h-10 sm:h-8">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {Object.entries(APPLICATION_STATUSES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-full sm:w-[140px] h-10 sm:h-8">
                  <SelectValue placeholder="Sortierung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Neueste zuerst</SelectItem>
                  <SelectItem value="hospital">Nach Klinik</SelectItem>
                  <SelectItem value="status">Nach Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[50vh] sm:h-[400px] w-full min-w-0">
              {filteredAnschreiben.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {anschreibenDocuments.length === 0
                    ? "Noch keine Anschreiben gespeichert."
                    : "Keine Anschreiben entsprechen dem Filter."}
                </p>
              ) : (
                <div className="space-y-2 min-w-0">
                  {filteredAnschreiben.map((doc) => renderAnschreibenItem(doc))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DocumentVersionsList;

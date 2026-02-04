import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  FileEdit, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  FolderOpen,
  Building2,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

interface DocumentVersion {
  id: string;
  name: string;
  typ: string;
  html_content: string;
  created_at: string;
  updated_at: string;
  hospital_name: string | null;
  department_or_specialty: string | null;
  position_title: string | null;
  job_url: string | null;
  applied: boolean | null;
  applied_date: string | null;
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
  const [filterApplied, setFilterApplied] = useState<"all" | "applied" | "not_applied">("all");
  const [sortBy, setSortBy] = useState<"newest" | "hospital">("newest");
  const { toast } = useToast();

  const fetchDocuments = async () => {
    if (!userId) return;
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching documents:", error);
      toast({ title: "Fehler", description: "Dokumente konnten nicht geladen werden.", variant: "destructive" });
    } else {
      setDocuments(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments();
  }, [userId, refreshTrigger]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("document_versions").delete().eq("id", id);
    if (error) {
      toast({ title: "Fehler", description: "Dokument konnte nicht gelöscht werden.", variant: "destructive" });
    } else {
      setDocuments(documents.filter((d) => d.id !== id));
      toast({ title: "Gelöscht", description: "Dokument wurde entfernt." });
    }
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

  const handleToggleApplied = async (id: string, currentApplied: boolean | null) => {
    const newApplied = !currentApplied;
    const update: Partial<DocumentVersion> = { 
      applied: newApplied,
      applied_date: newApplied ? new Date().toISOString().split("T")[0] : null
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

  const cvDocuments = documents.filter((d) => d.typ === "CV" || d.typ === "cv");
  const anschreibenDocuments = documents.filter((d) => d.typ === "Anschreiben" || d.typ === "anschreiben");

  const filteredAnschreiben = anschreibenDocuments
    .filter((d) => {
      if (filterApplied === "applied") return d.applied === true;
      if (filterApplied === "not_applied") return !d.applied;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "hospital") {
        return (a.hospital_name || "").localeCompare(b.hospital_name || "");
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const renderDocumentItem = (doc: DocumentVersion, isAnschreiben: boolean) => (
    <div key={doc.id} className="w-full border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors min-w-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 min-w-0">
        <div className="shrink-0 mt-0.5">
          {isAnschreiben ? (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
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
              {isAnschreiben && doc.hospital_name ? (
                <>
                  <span className="font-medium truncate block">{doc.hospital_name}</span>
                  {doc.department_or_specialty && (
                    <span className="text-muted-foreground block truncate">
                      – {doc.department_or_specialty}
                    </span>
                  )}
                </>
              ) : (
                <span className="font-medium truncate block">{doc.name}</span>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {isAnschreiben && doc.position_title && (
                  <span className="block truncate">{doc.position_title}</span>
                )}
                <span>{format(new Date(doc.created_at), "dd.MM.yyyy HH:mm", { locale: de })}</span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onLoadDocument(doc.html_content, isAnschreiben ? "anschreiben" : "cv", doc.created_at)}
            title="Laden"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setEditingId(doc.id); setEditName(doc.name); }}
            title="Umbenennen"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {!isAnschreiben && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDelete(doc.id)}
              title="Entfernen"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {isAnschreiben && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`applied-${doc.id}`}
              checked={doc.applied === true}
              onCheckedChange={() => handleToggleApplied(doc.id, doc.applied)}
            />
            <Label
              htmlFor={`applied-${doc.id}`}
              className={`text-xs cursor-pointer ${doc.applied ? "text-green-600 font-medium" : "text-muted-foreground"}`}
            >
              Beworben
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-destructive border-destructive/40 hover:text-destructive"
            onClick={() => handleDelete(doc.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Entfernen
          </Button>
        </div>
      )}
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
            <ScrollArea className="h-[300px] w-full min-w-0">
              {cvDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Noch keine Lebensläufe gespeichert.
                </p>
              ) : (
                <div className="space-y-2 min-w-0">
                  {cvDocuments.map((doc) => renderDocumentItem(doc, false))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="anschreiben" className="mt-4 space-y-3 min-w-0">
            {/* Filters */}
            <div className="flex gap-2 items-center flex-wrap min-w-0">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterApplied} onValueChange={(v) => setFilterApplied(v as typeof filterApplied)}>
                  <SelectTrigger className="w-[150px] h-8">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="applied">Beworben</SelectItem>
                    <SelectItem value="not_applied">Nicht beworben</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="w-[140px] h-8">
                  <SelectValue placeholder="Sortierung" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Neueste zuerst</SelectItem>
                  <SelectItem value="hospital">Nach Klinik</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[260px] w-full min-w-0">
              {filteredAnschreiben.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {anschreibenDocuments.length === 0 
                    ? "Noch keine Anschreiben gespeichert."
                    : "Keine Anschreiben entsprechen dem Filter."}
                </p>
              ) : (
                <div className="space-y-2 min-w-0">
                  {filteredAnschreiben.map((doc) => renderDocumentItem(doc, true))}
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

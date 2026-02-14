import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const DOC_TYPE_OPTIONS = [
  { value: "approbation", label: "Approbation" },
  { value: "language_certificate", label: "Sprachzertifikat" },
  { value: "course_certificate", label: "Kurszertifikat" },
  { value: "zeugnis", label: "Zeugnis" },
  { value: "other", label: "Sonstiges" },
];

const humanFileSize = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]+/g, "_");

interface UserDocumentsVaultProps {
  userId: string | null;
  onDocumentsChanged?: (documents: Tables<"user_documents">[]) => void;
}

const UserDocumentsVault = ({ userId, onDocumentsChanged }: UserDocumentsVaultProps) => {
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onDocumentsChangedRef = useRef(onDocumentsChanged);

  const [documents, setDocuments] = useState<Tables<"user_documents">[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState(DOC_TYPE_OPTIONS[0].value);
  const [expiresAt, setExpiresAt] = useState("");
  const [includeByDefault, setIncludeByDefault] = useState(true);

  useEffect(() => {
    onDocumentsChangedRef.current = onDocumentsChanged;
  }, [onDocumentsChanged]);

  const loadDocuments = useCallback(async () => {
    if (!userId) {
      setDocuments([]);
      onDocumentsChangedRef.current?.([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Dokumente konnten nicht geladen werden",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const next = data ?? [];
    setDocuments(next);
    onDocumentsChangedRef.current?.(next);
    setIsLoading(false);
  }, [toast, userId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > MAX_FILE_BYTES) {
      toast({
        title: "Datei zu gross",
        description: "Jede Datei darf maximal 10 MB gross sein.",
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Dateityp nicht erlaubt",
        description: "Bitte PDF, PNG oder JPG hochladen.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileName = sanitizeFileName(file.name);
      const filePath = `${userId}/documents/${Date.now()}-${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(filePath, file, { upsert: false, contentType: file.type });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await supabase.from("user_documents").insert({
        user_id: userId,
        doc_type: docType,
        title: title.trim() || null,
        file_path: filePath,
        file_name: fileName,
        mime_type: file.type,
        size_bytes: file.size,
        expires_at: expiresAt || null,
        include_by_default: includeByDefault,
      });

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Dokument hochgeladen",
        description: "Das Dokument ist jetzt fuer Bewerbungen verfuegbar.",
      });

      setTitle("");
      setExpiresAt("");
      setIncludeByDefault(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      void loadDocuments();
    } catch (error) {
      toast({
        title: "Upload fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleIncludeByDefault = async (doc: Tables<"user_documents">, checked: boolean) => {
    setBusyDocId(doc.id);
    const { error } = await supabase
      .from("user_documents")
      .update({ include_by_default: checked })
      .eq("id", doc.id);
    setBusyDocId(null);

    if (error) {
      toast({
        title: "Aktualisierung fehlgeschlagen",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const next = documents.map((item) =>
      item.id === doc.id ? { ...item, include_by_default: checked } : item
    );
    setDocuments(next);
    onDocumentsChangedRef.current?.(next);
  };

  const handleDelete = async (doc: Tables<"user_documents">) => {
    setBusyDocId(doc.id);

    try {
      const { error: storageError } = await supabase.storage.from("user-files").remove([doc.file_path]);
      if (storageError) {
        throw storageError;
      }

      const { error: deleteError } = await supabase.from("user_documents").delete().eq("id", doc.id);
      if (deleteError) {
        throw deleteError;
      }

      toast({ title: "Dokument geloescht" });
      const next = documents.filter((item) => item.id !== doc.id);
      setDocuments(next);
      onDocumentsChangedRef.current?.(next);
    } catch (error) {
      toast({
        title: "Loeschen fehlgeschlagen",
        description: error instanceof Error ? error.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setBusyDocId(null);
    }
  };

  const handleOpen = async (doc: Tables<"user_documents">) => {
    const { data, error } = await supabase.storage.from("user-files").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({
        title: "Datei kann nicht geoeffnet werden",
        description: error?.message || "Bitte erneut versuchen.",
        variant: "destructive",
      });
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Bewerbungsdokumente
        </CardTitle>
        <CardDescription>
          Approbation, Sprachzertifikate und weitere Nachweise fuer Bewerbungen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="doc-title">Titel (optional)</Label>
            <Input
              id="doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="z.B. Approbationsurkunde"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-type">Typ</Label>
            <select
              id="doc-type"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
            >
              {DOC_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="doc-expires">Gueltig bis (optional)</Label>
            <Input
              id="doc-expires"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 md:self-end">
            <Switch
              id="doc-default"
              checked={includeByDefault}
              onCheckedChange={setIncludeByDefault}
            />
            <Label htmlFor="doc-default">Standardmaessig anhaengen</Label>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleUpload}
          disabled={isUploading}
        />

        <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={!userId || isUploading}>
          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Dokument hochladen
        </Button>

        <p className="text-xs text-muted-foreground">Erlaubte Formate: PDF, PNG, JPG. Maximal 10 MB pro Datei.</p>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isBusy = busyDocId === doc.id;
              const option = DOC_TYPE_OPTIONS.find((item) => item.value === doc.doc_type);

              return (
                <div key={doc.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name ?? doc.title ?? "Dokument"}</p>
                      <p className="text-xs text-muted-foreground">
                        {option?.label || doc.doc_type} | {humanFileSize(doc.size_bytes)}
                        {doc.expires_at ? ` | gueltig bis ${doc.expires_at}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={doc.include_by_default ? "default" : "outline"}>
                        {doc.include_by_default ? "Default" : "Optional"}
                      </Badge>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleOpen(doc)}>
                        <Download className="mr-2 h-4 w-4" />
                        Oeffnen
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => handleDelete(doc)}
                      >
                        {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Entfernen
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Switch
                      id={`default-${doc.id}`}
                      checked={doc.include_by_default}
                      onCheckedChange={(checked) => toggleIncludeByDefault(doc, checked)}
                      disabled={isBusy}
                    />
                    <Label htmlFor={`default-${doc.id}`}>Standardmaessig in Bewerbungen verwenden</Label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Noch keine Bewerbungsdokumente hochgeladen.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserDocumentsVault;

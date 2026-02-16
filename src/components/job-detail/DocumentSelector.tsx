import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, FolderOpen, Upload } from "lucide-react";

const humanFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

interface DocumentSelectorProps {
  userDocuments: Tables<"user_documents">[];
  selectedDocIds: Set<string>;
  onToggleDoc: (docId: string, checked: boolean) => void;
}

const DocumentSelector = ({
  userDocuments,
  selectedDocIds,
  onToggleDoc,
}: DocumentSelectorProps) => {
  const selectedCount = selectedDocIds.size;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Bewerbungsunterlagen
          {userDocuments.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              {selectedCount}/{userDocuments.length} ausgewählt
            </span>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Approbation, Zertifikate und Zeugnisse werden mit CV und Anschreiben versendet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {userDocuments.length > 0 ? (
          <>
            {userDocuments.map((doc) => (
              <label
                key={doc.id}
                htmlFor={`doc-${doc.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`doc-${doc.id}`}
                  checked={selectedDocIds.has(doc.id)}
                  onCheckedChange={(checked) => onToggleDoc(doc.id, checked === true)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {doc.file_name ?? doc.title ?? doc.doc_type}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.doc_type}
                    {doc.size_bytes ? ` · ${humanFileSize(doc.size_bytes)}` : ""}
                  </p>
                </div>
              </label>
            ))}
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Noch keine Unterlagen hochgeladen.
            </p>
          </div>
        )}

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/unterlagen">
            {userDocuments.length === 0 ? (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Unterlagen hochladen
              </>
            ) : (
              <>
                <FolderOpen className="h-4 w-4 mr-2" />
                Unterlagen verwalten
              </>
            )}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default DocumentSelector;

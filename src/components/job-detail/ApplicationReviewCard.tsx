import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Eye,
  ExternalLink,
  FileText,
  Loader2,
  Send,
} from "lucide-react";

const humanFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export interface AttachmentPreview {
  fileName: string;
  sizeBytes: number;
  source: "generated" | "profile";
}

interface ApplicationReviewCardProps {
  job: Tables<"jobs">;
  subject: string;
  onSubjectChange: (value: string) => void;
  messageText: string;
  onMessageChange: (value: string) => void;
  preparedAttachments: AttachmentPreview[];
  isSending: boolean;
  isDownloadingPdf: boolean;
  onSend: () => void;
  onDownloadMerged: () => void;
  onPreviewFile: (index: number) => void;
  onDownloadFile: (index: number) => void;
}

const ApplicationReviewCard = ({
  job,
  subject,
  onSubjectChange,
  messageText,
  onMessageChange,
  preparedAttachments,
  isSending,
  isDownloadingPdf,
  onSend,
  onDownloadMerged,
  onPreviewFile,
  onDownloadFile,
}: ApplicationReviewCardProps) => {
  const totalAttachmentBytes = preparedAttachments.reduce((sum, item) => sum + item.sizeBytes, 0);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          Bewerbung prüfen & senden
        </CardTitle>
        <CardDescription className="text-xs">
          {job.contact_email
            ? `Wird an ${job.contact_email} gesendet.`
            : "Keine E-Mail verfügbar. Download als PDF möglich."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subject */}
        <div className="space-y-1.5">
          <Label htmlFor="application-subject" className="text-xs">
            Betreff
          </Label>
          <Input
            id="application-subject"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <Label htmlFor="application-message" className="text-xs">
            Nachricht
          </Label>
          <Textarea
            id="application-message"
            rows={8}
            value={messageText}
            onChange={(e) => onMessageChange(e.target.value)}
            className="text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Die Kontakt-E-Mail am Ende ist fest hinterlegt.
          </p>
        </div>

        {/* Attachments */}
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium">
            Anhänge ({preparedAttachments.length})
          </p>
          {preparedAttachments.map((item, index) => (
            <div
              key={`${item.fileName}-${index}`}
              className="flex items-center gap-2 text-sm"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1 text-xs">{item.fileName}</span>
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px] px-1.5 py-0"
              >
                {item.source === "generated" ? "KI" : "Profil"}
              </Badge>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {humanFileSize(item.sizeBytes)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onPreviewFile(index)}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onDownloadFile(index)}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <div className="text-[10px] text-muted-foreground pt-1 border-t tabular-nums">
            {humanFileSize(totalAttachmentBytes)} / {humanFileSize(MAX_ATTACHMENT_BYTES)}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {job.contact_email && (
            <Button
              onClick={onSend}
              disabled={isSending || !subject.trim() || !messageText.trim()}
              className="w-full"
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Per E-Mail senden
            </Button>
          )}

          <Button
            onClick={onDownloadMerged}
            disabled={isDownloadingPdf}
            variant="outline"
            className="w-full"
          >
            {isDownloadingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Als PDF herunterladen
          </Button>

          {(job.apply_url || job.source_url) && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-xs"
            >
              <a
                href={job.apply_url || job.source_url!}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Direkt beim Arbeitgeber bewerben
              </a>
            </Button>
          )}
        </div>

        {!job.contact_email && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Diese Stelle hat keine Kontakt-E-Mail. Sie können Ihre Bewerbung als PDF herunterladen.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ApplicationReviewCard;

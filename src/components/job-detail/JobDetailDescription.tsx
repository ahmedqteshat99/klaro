import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ListChecks } from "lucide-react";

interface JobDetailDescriptionProps {
  job: Tables<"jobs">;
}

/** Sanitize HTML by stripping script/style tags and event handlers */
const sanitizeHtml = (raw: string): string =>
  raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s*on\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s*on\w+\s*=\s*'[^']*'/gi, "");

const JobDetailDescription = ({ job }: JobDetailDescriptionProps) => {
  const hasDescription = job.description && job.description.trim().length > 10;
  const hasRequirements = job.requirements && job.requirements.trim().length > 10;

  if (!hasDescription && !hasRequirements) return null;

  return (
    <div className="space-y-4">
      {hasDescription && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Stellenbeschreibung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.description!) }}
            />
          </CardContent>
        </Card>
      )}

      {hasRequirements && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Anforderungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-base prose-headings:font-semibold prose-p:text-sm prose-p:leading-relaxed prose-li:text-sm prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(job.requirements!) }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobDetailDescription;

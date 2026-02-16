import { Link } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";
import { buildJobPath } from "@/lib/slug";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Clock, MapPin, ChevronRight } from "lucide-react";

const formatDate = (value: string | null) => {
  if (!value) return null;
  return new Date(value).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isNewJob = (publishedAt: string | null) => {
  if (!publishedAt) return false;
  const published = new Date(publishedAt);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return published >= sevenDaysAgo;
};

const isExpiringSoon = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  const expires = new Date(expiresAt);
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  return expires <= fourteenDaysFromNow && expires > new Date();
};

interface JobCardProps {
  job: Tables<"jobs">;
  onApplyClick?: (job: Tables<"jobs">) => void;
}

const JobCard = ({ job, onApplyClick }: JobCardProps) => {
  const jobPath = buildJobPath({
    id: job.id,
    title: job.title,
    hospitalName: job.hospital_name,
  });
  const isNew = isNewJob(job.published_at);
  const expiringSoon = isExpiringSoon(job.expires_at);
  const publishedDate = formatDate(job.published_at);

  return (
    <Card className="group overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5">
      <Link
        to={jobPath}
        onClick={() => onApplyClick?.(job)}
        className="block p-5 sm:p-6"
      >
        {/* Top row: badges + date */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {isNew && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0.5">
                Neu
              </Badge>
            )}
            {expiringSoon && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px] px-2 py-0.5">
                <Clock className="h-3 w-3 mr-1" />
                Bald ablaufend
              </Badge>
            )}
          </div>
          {publishedDate && (
            <span className="text-[11px] text-muted-foreground/60 tabular-nums">
              {publishedDate}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors">
          {job.title}
        </h2>

        {/* Hospital name — elevated, brand color */}
        {job.hospital_name && (
          <p className="text-sm font-medium text-primary/80 mb-2">
            {job.hospital_name}
          </p>
        )}

        {/* Location + Department — single line */}
        {(job.location || job.department) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            {job.location && (
              <>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{job.location}</span>
              </>
            )}
            {job.location && job.department && (
              <span className="text-border">·</span>
            )}
            {job.department && (
              <>
                {!job.location && <Building2 className="h-3.5 w-3.5 shrink-0" />}
                <span>{job.department}</span>
              </>
            )}
          </div>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-1">
            {job.tags.map((tag) => (
              <Badge key={`${job.id}-${tag}`} variant="secondary" className="text-[11px] px-2 py-0 font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Bottom CTA hint */}
        <div className="flex items-center justify-end mt-3 pt-3 border-t border-border/40">
          <span className="text-xs font-medium text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Stelle ansehen
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </Card>
  );
};

export default JobCard;
